"""
Authentication routes: login, register, refresh, logout.
"""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId

from auth.jwt_handler import (
    DUMMY_PASSWORD_HASH,
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    token_hash,
    get_refresh_token_expiry,
)
from auth.dependencies import get_current_user, CurrentUser, invalidate_password_version
from models.user import UserRole
from routes.legal import PRIVACY_VERSION

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============ SCHEMAS ============

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    name: str = Field(..., min_length=2, max_length=100)
    # Per registrazione autonoma tenant
    tenant_name: Optional[str] = Field(None, min_length=2, max_length=120)
    tenant_slug: Optional[str] = Field(None, min_length=2, max_length=50, pattern=r"^[a-z0-9-]+$")
    privacy_accepted: bool = False


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=72)


class VerifyPasswordRequest(BaseModel):
    password: str = Field(..., max_length=200)


class RegisterResponse(BaseModel):
    success: bool = True
    message: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = None


# ============ HELPERS ============

def user_to_response(user: dict, tenant_name: Optional[str] = None) -> dict:
    """Convert DB user to response dict."""
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "tenant_id": user.get("tenant_id"),
        "tenant_name": tenant_name,
    }


LOCK_MINUTES = 15
MAX_REGISTRATIONS_PER_HOUR = 20


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")


def _lock_rules(request: Request, email: str) -> list:
    """Contatore per IP+email (5 errori) e per account (10 errori): cambiare IP o X-Forwarded-For non aggira il blocco."""
    return [(f"{_client_ip(request)}:{email}", 5), (f"acct:{email}", 10)]


async def _ensure_not_locked(db, rules: list):
    now = datetime.now(timezone.utc)
    async for doc in db.login_attempts.find({"identifier": {"$in": [k for k, _ in rules]}}):
        locked_until = doc.get("locked_until")
        if locked_until and locked_until.replace(tzinfo=timezone.utc) > now:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Troppi tentativi errati. Riprova tra {LOCK_MINUTES} minuti."
            )


async def _register_failed_attempt(db, rules: list):
    now = datetime.now(timezone.utc)
    for identifier, limit in rules:
        doc = await db.login_attempts.find_one_and_update(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"last_attempt": now}},
            upsert=True,
            return_document=True,
        )
        if doc and doc.get("count", 0) >= limit:
            await db.login_attempts.update_one(
                {"identifier": identifier},
                {"$set": {"locked_until": now + timedelta(minutes=LOCK_MINUTES), "count": 0}}
            )


async def _clear_attempts(db, rules: list):
    await db.login_attempts.delete_many({"identifier": {"$in": [k for k, _ in rules]}})


# ============ ROUTES ============

@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(body: RegisterRequest, request: Request):
    """
    Registra un nuovo utente.
    - Se tenant_name e tenant_slug sono forniti: crea nuovo tenant + utente admin
    - Altrimenti: errore (solo superadmin può creare utenti senza tenant)
    """
    db = request.app.state.db
    email = body.email.lower()

    # Prima di tutto il consenso: senza, nessuna informazione su email o slug esistenti
    if not body.privacy_accepted:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Per registrarti devi confermare di aver letto l'informativa privacy"
        )

    # Check if email already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email già registrata"
        )
    
    # Validate: must provide tenant info for self-registration
    if not body.tenant_name or not body.tenant_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Per registrarti devi fornire il nome e lo slug del tuo locale"
        )
    
    # Check if tenant slug already exists
    existing_tenant = await db.tenants.find_one({"slug": body.tenant_slug})
    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Questo slug è già in uso. Scegli un identificativo diverso."
        )

    now = datetime.now(timezone.utc)
    recent = await db.tenants.count_documents({"status": "in_attesa", "created_at": {"$gte": now - timedelta(hours=1)}})
    if recent >= MAX_REGISTRATIONS_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Troppe registrazioni in questo momento. Riprova tra poco."
        )
    
    # Create tenant (status: in_attesa - needs superadmin approval)
    tenant_doc = {
        "name": body.tenant_name,
        "slug": body.tenant_slug,
        "status": "in_attesa",  # Default: pending approval
        "settings": {
            "timezone": "Europe/Rome",
            "closing_days": [],
            "closing_message": "",
            "daily_categories": ["Primi", "Secondi", "Contorni"],
            "site_url": None,
            "ftp": {"host": None, "user": None, "port": 21, "directory": None, "has_password": False}
        },
        "order_counter": 0,
        "privacy_accepted_at": now,
        "privacy_version": PRIVACY_VERSION,
        "created_at": now,
        "updated_at": None,
    }
    tenant_result = await db.tenants.insert_one(tenant_doc)
    tenant_id = str(tenant_result.inserted_id)
    
    # Create user as tenant_admin
    user_doc = {
        "email": email,
        "name": body.name,
        "password_hash": hash_password(body.password),
        "role": UserRole.TENANT_ADMIN.value,
        "tenant_id": tenant_id,
        "disabled": False,
        "created_at": now,
        "last_login": now,
    }
    await db.users.insert_one(user_doc)

    # Nessun token: il locale resta inutilizzabile finché il superadmin non lo approva
    return RegisterResponse(message="Registrazione ricevuta: riceverai una conferma quando il tuo locale sarà attivato.")


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request):
    """Login con email e password."""
    db = request.app.state.db
    email = body.email.lower()
    
    rules = _lock_rules(request, email)
    await _ensure_not_locked(db, rules)

    user = await db.users.find_one({"email": email})
    # bcrypt viene eseguito sempre, anche se l'utente non esiste
    password_ok = verify_password(body.password, user["password_hash"] if user else DUMMY_PASSWORD_HASH)
    if not user or not password_ok:
        await _register_failed_attempt(db, rules)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o password non validi"
        )

    # Stato account mostrato solo a chi conosce la password
    if user.get("disabled", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account disabilitato"
        )

    await _clear_attempts(db, rules)

    # Check tenant status (if not superadmin)
    tenant_name = None
    legacy = False
    if user.get("tenant_id"):
        tenant = await db.tenants.find_one({"_id": ObjectId(user["tenant_id"])})
        if tenant:
            tenant_name = tenant["name"]
            legacy = bool(tenant.get("legacy_data"))
            if tenant["status"] == "sospeso":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Il tuo locale è stato sospeso. Contatta l'assistenza."
                )
            if tenant["status"] == "in_attesa":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Il tuo locale è in attesa di approvazione."
                )
    
    now = datetime.now(timezone.utc)
    
    # Update last_login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": now}}
    )
    
    # Create tokens
    access_token = create_access_token(
        user_id=str(user["_id"]),
        email=user["email"],
        role=user["role"],
        tenant_id=user.get("tenant_id"),
        extra_claims={"legacy": legacy, "pv": user.get("password_version", 0)}
    )
    refresh_token = create_refresh_token()
    
    # Store refresh token
    await db.refresh_tokens.insert_one({
        "token_hash": token_hash(refresh_token),
        "user_id": str(user["_id"]),
        "tenant_id": user.get("tenant_id"),
        "created_at": now,
        "expires_at": get_refresh_token_expiry(),
        "revoked": False,
    })
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600,
        user=user_to_response(user, tenant_name)
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, request: Request):
    """Refresh access token using refresh token."""
    db = request.app.state.db
    now = datetime.now(timezone.utc)
    
    # Find and invalidate old refresh token (single use)
    old_token = await db.refresh_tokens.find_one_and_update(
        {
            "token_hash": token_hash(body.refresh_token),
            "revoked": False,
            "expires_at": {"$gt": now}
        },
        {"$set": {"revoked": True}}
    )
    
    if not old_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token di refresh non valido o scaduto"
        )
    
    # Get user
    user = await db.users.find_one({"_id": ObjectId(old_token["user_id"])})
    if not user or user.get("disabled", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utente non trovato o disabilitato"
        )
    
    # Check tenant status
    tenant_name = None
    legacy = False
    if user.get("tenant_id"):
        tenant = await db.tenants.find_one({"_id": ObjectId(user["tenant_id"])})
        if tenant:
            tenant_name = tenant["name"]
            legacy = bool(tenant.get("legacy_data"))
            if tenant["status"] in ("sospeso", "in_attesa"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Locale non attivo"
                )
    
    # Create new tokens
    access_token = create_access_token(
        user_id=str(user["_id"]),
        email=user["email"],
        role=user["role"],
        tenant_id=user.get("tenant_id"),
        extra_claims={"legacy": legacy, "pv": user.get("password_version", 0)}
    )
    new_refresh_token = create_refresh_token()
    
    # Store new refresh token
    await db.refresh_tokens.insert_one({
        "token_hash": token_hash(new_refresh_token),
        "user_id": str(user["_id"]),
        "tenant_id": user.get("tenant_id"),
        "created_at": now,
        "expires_at": get_refresh_token_expiry(),
        "revoked": False,
    })
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=3600,
        user=user_to_response(user, tenant_name)
    )


@router.post("/verify-password")
async def verify_own_password(body: VerifyPasswordRequest, request: Request, user: CurrentUser = Depends(get_current_user)):
    """Conferma della propria password per sbloccare funzioni delicate (es. impostazioni Report)."""
    db = request.app.state.db
    rules = [(f"verify:{user.id}", 5)]
    await _ensure_not_locked(db, rules)
    doc = await db.users.find_one({"_id": ObjectId(user.id)})
    if not doc or not verify_password(body.password, doc["password_hash"]):
        await _register_failed_attempt(db, rules)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Password non corretta")
    await _clear_attempts(db, rules)
    return {"ok": True}


@router.post("/logout", status_code=204)
async def logout(body: RefreshRequest, request: Request):
    """Logout - invalidate refresh token."""
    db = request.app.state.db
    
    await db.refresh_tokens.update_one(
        {"token_hash": token_hash(body.refresh_token)},
        {"$set": {"revoked": True}}
    )
    
    return None


@router.get("/me", response_model=UserResponse)
async def get_me(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get current authenticated user info."""
    db = request.app.state.db
    
    user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utente non trovato"
        )
    
    tenant_name = None
    if user.get("tenant_id"):
        tenant = await db.tenants.find_one({"_id": ObjectId(user["tenant_id"])})
        if tenant:
            tenant_name = tenant["name"]
    
    return UserResponse(**user_to_response(user, tenant_name))


@router.post("/change-password", response_model=TokenResponse)
async def change_password(
    body: ChangePasswordRequest,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Cambia password, scollega tutti gli altri dispositivi e restituisce una nuova sessione per questo."""
    db = request.app.state.db
    user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    if not user or user.get("disabled", False):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utente non trovato o disabilitato")
    if not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La password attuale non è corretta")
    if body.new_password == body.current_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La nuova password deve essere diversa da quella attuale")

    now = datetime.now(timezone.utc)
    version = user.get("password_version", 0) + 1
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(body.new_password), "password_version": version, "password_changed_at": now}}
    )
    await db.refresh_tokens.update_many(
        {"user_id": str(user["_id"]), "revoked": False},
        {"$set": {"revoked": True}}
    )
    invalidate_password_version(str(user["_id"]))

    tenant_name = None
    legacy = False
    if user.get("tenant_id"):
        tenant = await db.tenants.find_one({"_id": ObjectId(user["tenant_id"])})
        if tenant:
            tenant_name = tenant["name"]
            legacy = bool(tenant.get("legacy_data"))

    access_token = create_access_token(
        user_id=str(user["_id"]),
        email=user["email"],
        role=user["role"],
        tenant_id=user.get("tenant_id"),
        extra_claims={"legacy": legacy, "pv": version}
    )
    new_refresh_token = create_refresh_token()
    await db.refresh_tokens.insert_one({
        "token_hash": token_hash(new_refresh_token),
        "user_id": str(user["_id"]),
        "tenant_id": user.get("tenant_id"),
        "created_at": now,
        "expires_at": get_refresh_token_expiry(),
        "revoked": False,
    })
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=3600,
        user=user_to_response(user, tenant_name)
    )
