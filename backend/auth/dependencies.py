"""
FastAPI dependencies for authentication and authorization.
"""
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
import time
from bson import ObjectId
from .jwt_handler import verify_access_token

# HTTP Bearer scheme for extracting tokens
bearer_scheme = HTTPBearer(auto_error=False)

# Versione password per utente (token emessi prima di un cambio password = non validi).
# Cache per processo: con più worker/repliche un vecchio token resta valido al massimo 30 s.
PV_CACHE_SECONDS = 30
_pv_cache: dict = {}


def invalidate_password_version(user_id: str) -> None:
    _pv_cache.pop(user_id, None)


async def password_version(db, user_id: str) -> Optional[int]:
    cached = _pv_cache.get(user_id)
    if cached and cached[1] > time.monotonic():
        return cached[0]
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_version": 1, "disabled": 1})
    version = None if not user or user.get("disabled") else user.get("password_version", 0)
    _pv_cache[user_id] = (version, time.monotonic() + PV_CACHE_SECONDS)
    return version


class CurrentUser:
    """
    Represents the authenticated user from JWT claims.
    This is a lightweight object - for full user data, query the DB.
    """
    def __init__(self, claims: dict):
        self.id: str = claims["sub"]
        self.email: str = claims["email"]
        self.role: str = claims["role"]
        self.tenant_id: Optional[str] = claims.get("tenant_id")
    
    def is_superadmin(self) -> bool:
        return self.role == "superadmin"
    
    def is_tenant_admin(self) -> bool:
        return self.role in ("superadmin", "tenant_admin")
    
    def can_access_tenant(self, tenant_id: str) -> bool:
        """Check if user can access a specific tenant's data."""
        if self.is_superadmin():
            return True
        return self.tenant_id == tenant_id


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> Optional[CurrentUser]:
    """
    Get current user if authenticated, None otherwise.
    Use this for endpoints that work both authenticated and anonymous.
    """
    if not credentials or credentials.scheme.lower() != "bearer":
        return None
    
    claims = verify_access_token(credentials.credentials)
    if not claims:
        return None
    
    return CurrentUser(claims)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> CurrentUser:
    """
    Get current authenticated user or raise 401.
    Use as dependency: user = Depends(get_current_user)
    """
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token di autenticazione mancante",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    claims = verify_access_token(credentials.credentials)
    if not claims or await password_version(request.app.state.db, claims["sub"]) != claims.get("pv", 0):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token non valido o scaduto",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return CurrentUser(claims)


async def get_current_active_user(
    user: CurrentUser = Depends(get_current_user)
) -> CurrentUser:
    """
    Get current user and verify they're not disabled.
    Note: For real-time disable checks, query the DB.
    """
    # JWT doesn't have disabled flag - for real-time check, query DB
    return user


def require_roles(*allowed_roles: str):
    """
    Dependency factory for role-based access control.
    Usage: user = Depends(require_roles("superadmin", "tenant_admin"))
    """
    async def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permessi insufficienti per questa operazione"
            )
        return user
    return dependency


def require_tenant(tenant_id_param: str = "tenant_id"):
    """
    Dependency factory to verify user can access the tenant.
    Usage: user = Depends(require_tenant("tenant_id"))
    
    The tenant_id comes from path/query params.
    """
    async def dependency(
        user: CurrentUser = Depends(get_current_user),
        # Note: FastAPI will inject the path param automatically
    ) -> CurrentUser:
        # This is a placeholder - actual tenant_id check happens in the route
        # since path params are injected differently
        return user
    return dependency
