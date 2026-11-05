"""Isolamento dati per locale (tenant).

Il locale "storico" (legacy) usa i documenti SENZA campo tenant_id: i dati esistenti
non vengono mai modificati né migrati. Gli altri locali scrivono sempre tenant_id.
"""
import contextvars
from dataclasses import dataclass
from typing import Optional

from starlette.responses import JSONResponse

from auth.jwt_handler import verify_access_token

SCOPED_COLLECTIONS = {"categories", "dishes", "daily_menus", "orders", "customers", "missed_sales"}

PUBLIC_PREFIXES = ("/api/auth", "/api/superadmin", "/api/public", "/api/landing", "/api/admin", "/api/debug")
LEGACY_PUBLIC_PREFIXES = ("/api/public/menu", "/public/menu")


@dataclass(frozen=True)
class TenantContext:
    tenant_id: Optional[str]
    legacy: bool


current_tenant: contextvars.ContextVar[Optional[TenantContext]] = contextvars.ContextVar("current_tenant", default=None)


def get_tenant() -> TenantContext:
    ctx = current_tenant.get()
    if ctx is None:
        raise RuntimeError("Contesto locale mancante")
    return ctx


def tenant_filter() -> dict:
    ctx = get_tenant()
    return {"tenant_id": None} if ctx.legacy else {"tenant_id": ctx.tenant_id}


def _scope(query: Optional[dict]) -> dict:
    tf = tenant_filter()
    return {"$and": [query, tf]} if query else tf


class ScopedCollection:
    def __init__(self, col):
        self._col = col

    def find(self, filter=None, *args, **kwargs):
        return self._col.find(_scope(filter), *args, **kwargs)

    async def find_one(self, filter=None, *args, **kwargs):
        return await self._col.find_one(_scope(filter), *args, **kwargs)

    async def count_documents(self, filter=None, *args, **kwargs):
        return await self._col.count_documents(_scope(filter), *args, **kwargs)

    async def update_one(self, filter, update, *args, **kwargs):
        return await self._col.update_one(_scope(filter), update, *args, **kwargs)

    async def delete_one(self, filter, *args, **kwargs):
        return await self._col.delete_one(_scope(filter), *args, **kwargs)

    async def insert_one(self, doc, *args, **kwargs):
        ctx = get_tenant()
        if not ctx.legacy:
            doc["tenant_id"] = ctx.tenant_id
        return await self._col.insert_one(doc, *args, **kwargs)

    async def create_index(self, *args, **kwargs):
        return await self._col.create_index(*args, **kwargs)


class ScopedDatabase:
    def __init__(self, db):
        self._db = db

    def __getattr__(self, name):
        attr = getattr(self._db, name)
        return ScopedCollection(attr) if name in SCOPED_COLLECTIONS else attr


def _bearer(scope) -> Optional[str]:
    for key, value in scope.get("headers", []):
        if key == b"authorization":
            parts = value.decode("latin-1").split(" ", 1)
            if len(parts) == 2 and parts[0].lower() == "bearer":
                return parts[1].strip()
    return None


class TenantContextMiddleware:
    """Imposta il locale corrente dal token JWT; blocca le API dati senza login."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        path = scope["path"]
        if path.startswith(LEGACY_PUBLIC_PREFIXES):
            ctx = TenantContext(None, True)
        elif not path.startswith("/api/") or path == "/api/" or path.startswith(PUBLIC_PREFIXES):
            return await self.app(scope, receive, send)
        else:
            token = _bearer(scope)
            claims = verify_access_token(token) if token else None
            if not claims or not claims.get("tenant_id"):
                response = JSONResponse({"detail": "Accesso richiesto"}, status_code=401)
                return await response(scope, receive, send)
            ctx = TenantContext(claims["tenant_id"], bool(claims.get("legacy")))
        reset_token = current_tenant.set(ctx)
        try:
            await self.app(scope, receive, send)
        finally:
            current_tenant.reset(reset_token)
