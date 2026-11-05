"""
Superadmin routes: gestione tenant, richieste demo.
"""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId

from auth.dependencies import require_roles, CurrentUser
from auth.jwt_handler import hash_password
from models.tenant import TenantStatus, TenantSettings
from models.user import UserRole
from models.demo_request import DemoRequestStatus

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
