"""
Superadmin routes: gestione tenant, richieste demo.
"""
import asyncio
import time

from fastapi import APIRouter, HTTPException, status, Depends, Request, UploadFile, File
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime, timezone
from bson import Binary, ObjectId

from auth.dependencies import require_roles, CurrentUser
from auth.jwt_handler import hash_password
from models.tenant import TenantStatus, TenantSettings
from models.user import UserRole
from models.demo_request import DemoRequestStatus
from tenant_profile import (
    MAX_LOGO_BYTES, WEEKDAYS, FtpNotConfigured, encrypt_secret, ftp_config, ftp_test, process_logo,
)

router = APIRouter(prefix="/superadmin", tags=["Superadmin"])


# ============ SCHEMAS ============

class TenantCreateRequest(BaseModel):
    """Schema per creare un tenant da superadmin."""
    name: str = Field(..., min_length=2, max_length=120)
    slug: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-z0-9-]+$")
    owner_email: EmailStr
    owner_password: str = Field(..., min_length=8, max_length=72)
    owner_name: str = Field(..., min_length=2, max_length=100)
    status: TenantStatus = TenantStatus.ACTIVE  # Superadmin può creare attivi


class TenantResponse(BaseModel):
    id: str
    name: str
    slug: str
    status: str
    owner_email: Optional[str] = None
    owner_name: Optional[str] = None
    created_at: datetime
    users_count: int = 0
    orders_count: int = 0


class TenantListResponse(BaseModel):
    tenants: List[TenantResponse]
    total: int


class TenantStatusUpdate(BaseModel):
    status: TenantStatus


class DemoRequestResponse(BaseModel):
    id: str
    restaurant_name: str
    contact_name: str
    email: str
    phone: Optional[str] = None
    message: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime


class DemoRequestListResponse(BaseModel):
    requests: List[DemoRequestResponse]
    total: int


class DemoRequestUpdate(BaseModel):
    status: Optional[DemoRequestStatus] = None
    notes: Optional[str] = None


class StatsResponse(BaseModel):
    total_tenants: int
    active_tenants: int
    pending_tenants: int
    suspended_tenants: int
    total_demo_requests: int
    new_demo_requests: int


# ============ ROUTES ============

@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    request: Request,
    user: CurrentUser = Depends(require_roles("superadmin"))
):
    """Get dashboard statistics for superadmin."""
    db = request.app.state.db
    
    # Aggregate tenant stats
    tenants = await db.tenants.find().to_list(1000)
    active = sum(1 for t in tenants if t.get("status") == "attivo")
    pending = sum(1 for t in tenants if t.get("status") == "in_attesa")
    suspended = sum(1 for t in tenants if t.get("status") == "sospeso")
    
    # Demo requests stats
    demo_requests = await db.demo_requests.count_documents({})
    new_requests = await db.demo_requests.count_documents({"status": "nuova"})
    
    return StatsResponse(
        total_tenants=len(tenants),
        active_tenants=active,
        pending_tenants=pending,
        suspended_tenants=suspended,
        total_demo_requests=demo_requests,
        new_demo_requests=new_requests
    )


@router.get("/tenants", response_model=TenantListResponse)
async def list_tenants(
    request: Request,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: CurrentUser = Depends(require_roles("superadmin"))
):
    """List all tenants."""
    db = request.app.state.db
    
    query = {}
    if status:
        query["status"] = status
    
    total = await db.tenants.count_documents(query)
    tenants = await db.tenants.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for t in tenants:
        # Get owner info
        owner = await db.users.find_one({
            "tenant_id": str(t["_id"]),
            "role": "tenant_admin"
        })
        
        # Get counts
        users_count = await db.users.count_documents({"tenant_id": str(t["_id"])})
        orders_count = await db.orders.count_documents({"tenant_id": str(t["_id"])})
        
        result.append(TenantResponse(
            id=str(t["_id"]),
            name=t["name"],
            slug=t["slug"],
            status=t["status"],
            owner_email=owner["email"] if owner else None,
            owner_name=owner["name"] if owner else None,
            created_at=t["created_at"],
            users_count=users_count,
            orders_count=orders_count
        ))
    
    return TenantListResponse(tenants=result, total=total)


@router.post("/tenants", response_model=TenantResponse, status_code=201)
async def create_tenant(
    body: TenantCreateRequest,
    request: Request,
    user: CurrentUser = Depends(require_roles("superadmin"))
):
    """Create a new tenant with owner user."""
    db = request.app.state.db
    
    # Check slug uniqueness
    existing = await db.tenants.find_one({"slug": body.slug})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Questo slug è già in uso"
        )
    
    # Check email uniqueness
    existing_user = await db.users.find_one({"email": body.owner_email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Questa email è già registrata"
        )
    
    now = datetime.now(timezone.utc)
    
    # Create tenant
    tenant_doc = {
        "name": body.name,
        "slug": body.slug,
        "status": body.status.value,
        "settings": {
            "timezone": "Europe/Rome",
            "closing_days": [],
            "closing_message": "",
            "daily_categories": ["Primi", "Secondi", "Contorni"],
            "site_url": None,
            "ftp": {"host": None, "user": None, "port": 21, "directory": None, "has_password": False}
        },
        "order_counter": 0,
        "created_at": now,
        "updated_at": None,
    }
    result = await db.tenants.insert_one(tenant_doc)
    tenant_id = str(result.inserted_id)
    
    # Create owner user
    user_doc = {
        "email": body.owner_email.lower(),
        "name": body.owner_name,
        "password_hash": hash_password(body.owner_password),
        "role": UserRole.TENANT_ADMIN.value,
        "tenant_id": tenant_id,
        "disabled": False,
        "created_at": now,
        "last_login": None,
    }
    await db.users.insert_one(user_doc)
    
    return TenantResponse(
        id=tenant_id,
        name=body.name,
        slug=body.slug,
        status=body.status.value,
        owner_email=body.owner_email,
        owner_name=body.owner_name,
        created_at=now,
        users_count=1,
        orders_count=0
    )


@router.patch("/tenants/{tenant_id}/status", response_model=TenantResponse)
async def update_tenant_status(
    tenant_id: str,
    body: TenantStatusUpdate,
    request: Request,
    user: CurrentUser = Depends(require_roles("superadmin"))
):
    """Update tenant status (activate, suspend, etc.)."""
    db = request.app.state.db
    
    # Validate ObjectId format
    if not ObjectId.is_valid(tenant_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant non trovato"
        )
    
    tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant non trovato"
        )
    
    now = datetime.now(timezone.utc)
    await db.tenants.update_one(
        {"_id": ObjectId(tenant_id)},
        {"$set": {"status": body.status.value, "updated_at": now}}
    )
    
    # Get updated info
    owner = await db.users.find_one({
        "tenant_id": tenant_id,
        "role": "tenant_admin"
    })
    users_count = await db.users.count_documents({"tenant_id": tenant_id})
    orders_count = await db.orders.count_documents({"tenant_id": tenant_id})
    
    return TenantResponse(
        id=tenant_id,
        name=tenant["name"],
        slug=tenant["slug"],
        status=body.status.value,
        owner_email=owner["email"] if owner else None,
        owner_name=owner["name"] if owner else None,
        created_at=tenant["created_at"],
        users_count=users_count,
        orders_count=orders_count
    )


@router.get("/demo-requests", response_model=DemoRequestListResponse)
async def list_demo_requests(
    request: Request,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: CurrentUser = Depends(require_roles("superadmin"))
):
    """List demo requests from landing page."""
    db = request.app.state.db
    
    query = {}
    if status:
        query["status"] = status
    
    total = await db.demo_requests.count_documents(query)
    requests = await db.demo_requests.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = [
        DemoRequestResponse(
            id=str(r["_id"]),
            restaurant_name=r["restaurant_name"],
            contact_name=r["contact_name"],
            email=r["email"],
            phone=r.get("phone"),
            message=r.get("message"),
            status=r.get("status", "nuova"),
            notes=r.get("notes"),
            created_at=r["created_at"]
        )
        for r in requests
    ]
    
    return DemoRequestListResponse(requests=result, total=total)


@router.patch("/demo-requests/{request_id}", response_model=DemoRequestResponse)
async def update_demo_request(
    request_id: str,
    body: DemoRequestUpdate,
    request: Request,
    user: CurrentUser = Depends(require_roles("superadmin"))
):
    """Update a demo request (status, notes)."""
    db = request.app.state.db
    
    # Validate ObjectId format
    if not ObjectId.is_valid(request_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Richiesta non trovata"
        )
    
    demo_req = await db.demo_requests.find_one({"_id": ObjectId(request_id)})
    if not demo_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Richiesta non trovata"
        )
    
    update_data = {"updated_at": datetime.now(timezone.utc)}
    if body.status:
        update_data["status"] = body.status.value
    if body.notes is not None:
        update_data["notes"] = body.notes
    
    await db.demo_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": update_data}
    )
    
    # Get updated
    demo_req = await db.demo_requests.find_one({"_id": ObjectId(request_id)})
    
    return DemoRequestResponse(
        id=str(demo_req["_id"]),
        restaurant_name=demo_req["restaurant_name"],
        contact_name=demo_req["contact_name"],
        email=demo_req["email"],
        phone=demo_req.get("phone"),
        message=demo_req.get("message"),
        status=demo_req.get("status", "nuova"),
        notes=demo_req.get("notes"),
        created_at=demo_req["created_at"]
    )


# ============ IMPOSTAZIONI LOCALE ============

class CompanyInfo(BaseModel):
    legal_name: str = Field("", max_length=160)
    vat_number: str = Field("", max_length=32)
    address: str = Field("", max_length=240)
    phone: str = Field("", max_length=40)
    email: str = Field("", max_length=160)


class MenuMessages(BaseModel):
    closing_days: List[str] = []
    closing_message: str = Field("", max_length=300)
    pending_message: str = Field("", max_length=300)

    @field_validator("closing_days")
    @classmethod
    def valid_days(cls, v):
        bad = [d for d in v if d not in WEEKDAYS]
        if bad:
            raise ValueError(f"Giorni non validi: {bad}")
        return [d for d in WEEKDAYS if d in v]


class FtpSettingsIn(BaseModel):
    host: str = Field("", max_length=200)
    port: int = Field(21, ge=1, le=65535)
    user: str = Field("", max_length=200)
    directory: str = Field("", max_length=300)
    password: Optional[str] = Field(None, max_length=200)  # vuota = mantieni quella salvata


class FtpSettingsOut(BaseModel):
    host: str = ""
    port: int = 21
    user: str = ""
    directory: str = ""
    has_password: bool = False


class TenantSettingsIn(BaseModel):
    company: CompanyInfo
    menu: MenuMessages
    ftp: FtpSettingsIn


class TenantSettingsOut(BaseModel):
    id: str
    name: str
    slug: str
    company: CompanyInfo
    menu: MenuMessages
    ftp: FtpSettingsOut
    logo_url: Optional[str] = None


async def _tenant_or_404(db, tenant_id: str) -> dict:
    tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)}) if ObjectId.is_valid(tenant_id) else None
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant non trovato")
    return tenant


def _settings_out(t: dict) -> TenantSettingsOut:
    st = t.get("settings") or {}
    ftp = st.get("ftp") or {}
    version = t.get("logo_version")
    return TenantSettingsOut(
        id=str(t["_id"]),
        name=t["name"],
        slug=t["slug"],
        company=CompanyInfo(**{k: v or "" for k, v in (t.get("company") or {}).items() if k in CompanyInfo.model_fields}),
        menu=MenuMessages(
            closing_days=st.get("closing_days") or [],
            closing_message=st.get("closing_message") or "",
            pending_message=st.get("menu_pending_message") or "",
        ),
        ftp=FtpSettingsOut(
            host=ftp.get("host") or "",
            port=ftp.get("port") or 21,
            user=ftp.get("user") or "",
            directory=ftp.get("directory") or "",
            has_password=bool(ftp.get("password_encrypted") or ftp.get("password_plain")),
        ),
        logo_url=f"/api/public/tenant-logo/{t['_id']}?v={version}" if version else None,
    )


@router.get("/tenants/{tenant_id}/settings", response_model=TenantSettingsOut)
async def get_tenant_settings(tenant_id: str, request: Request, user: CurrentUser = Depends(require_roles("superadmin"))):
    return _settings_out(await _tenant_or_404(request.app.state.db, tenant_id))


@router.put("/tenants/{tenant_id}/settings", response_model=TenantSettingsOut)
async def update_tenant_settings(tenant_id: str, body: TenantSettingsIn, request: Request, user: CurrentUser = Depends(require_roles("superadmin"))):
    db = request.app.state.db
    tenant = await _tenant_or_404(db, tenant_id)
    update = {
        "company": {k: v.strip() for k, v in body.company.model_dump().items()},
        "settings.closing_days": body.menu.closing_days,
        "settings.closing_message": body.menu.closing_message.strip(),
        "settings.menu_pending_message": body.menu.pending_message.strip(),
        "settings.ftp.host": body.ftp.host.strip(),
        "settings.ftp.port": body.ftp.port,
        "settings.ftp.user": body.ftp.user.strip(),
        "settings.ftp.directory": body.ftp.directory.strip().strip("/"),
        "updated_at": datetime.now(timezone.utc),
    }
    unset = {}
    if body.ftp.password:
        update["settings.ftp.password_encrypted"] = encrypt_secret(body.ftp.password)
        update["settings.ftp.has_password"] = True
        unset["settings.ftp.password_plain"] = ""
    ops = {"$set": update}
    if unset:
        ops["$unset"] = unset
    await db.tenants.update_one({"_id": tenant["_id"]}, ops)
    return _settings_out(await db.tenants.find_one({"_id": tenant["_id"]}))


@router.post("/tenants/{tenant_id}/ftp-test")
async def test_tenant_ftp(tenant_id: str, body: FtpSettingsIn, request: Request, user: CurrentUser = Depends(require_roles("superadmin"))):
    """Prova l'accesso FTP con i dati del modulo (password vuota = quella salvata)."""
    tenant = await _tenant_or_404(request.app.state.db, tenant_id)
    saved = (tenant.get("settings") or {}).get("ftp") or {}
    form = {**saved, "host": body.host, "port": body.port, "user": body.user, "directory": body.directory}
    try:
        cfg = ftp_config(form, body.password or saved.get("password_plain") or None)
        message = await asyncio.to_thread(ftp_test, cfg)
    except FtpNotConfigured as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Collegamento non riuscito: {e}")
    return {"ok": True, "message": message}


@router.post("/tenants/{tenant_id}/logo", response_model=TenantSettingsOut)
async def upload_tenant_logo(tenant_id: str, request: Request, file: UploadFile = File(...), user: CurrentUser = Depends(require_roles("superadmin"))):
    db = request.app.state.db
    tenant = await _tenant_or_404(db, tenant_id)
    raw = await file.read(MAX_LOGO_BYTES + 1)
    if len(raw) > MAX_LOGO_BYTES:
        raise HTTPException(status_code=413, detail="Logo troppo grande (massimo 5 MB)")
    try:
        data = process_logo(raw)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    now = datetime.now(timezone.utc)
    await db.tenant_logos.update_one(
        {"tenant_id": tenant_id},
        {"$set": {"tenant_id": tenant_id, "content_type": "image/png", "data": Binary(data), "updated_at": now}},
        upsert=True,
    )
    await db.tenants.update_one({"_id": tenant["_id"]}, {"$set": {"logo_version": int(time.time() * 1000), "updated_at": now}})
    return _settings_out(await db.tenants.find_one({"_id": tenant["_id"]}))


@router.delete("/tenants/{tenant_id}/logo", response_model=TenantSettingsOut)
async def delete_tenant_logo(tenant_id: str, request: Request, user: CurrentUser = Depends(require_roles("superadmin"))):
    db = request.app.state.db
    tenant = await _tenant_or_404(db, tenant_id)
    await db.tenant_logos.delete_one({"tenant_id": tenant_id})
    await db.tenants.update_one({"_id": tenant["_id"]}, {"$unset": {"logo_version": ""}})
    return _settings_out(await db.tenants.find_one({"_id": tenant["_id"]}))
