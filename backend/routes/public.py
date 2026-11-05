"""
Public routes: landing page API, demo requests.
"""
from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/public", tags=["Public"])


# ============ SCHEMAS ============

class DemoRequestCreate(BaseModel):
    """Schema per richiesta demo dalla landing page."""
    restaurant_name: str = Field(..., min_length=2, max_length=120)
    contact_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    message: Optional[str] = Field(None, max_length=1000)


class DemoRequestResponse(BaseModel):
    success: bool = True
    message: str = "Richiesta inviata con successo! Ti contatteremo presto."


# ============ ROUTES ============

@router.post("/demo-request", response_model=DemoRequestResponse, status_code=201)
async def create_demo_request(body: DemoRequestCreate, request: Request):
    """
    Submit a demo request from the landing page.
    No authentication required.
    """
    db = request.app.state.db
    
    # Check for duplicate recent requests (same email in last 24h)
    from datetime import timedelta
    recent = await db.demo_requests.find_one({
        "email": body.email.lower(),
        "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(hours=24)}
    })
    if recent:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Hai già inviato una richiesta nelle ultime 24 ore"
        )
    
    # Create demo request
    doc = {
        "restaurant_name": body.restaurant_name,
        "contact_name": body.contact_name,
        "email": body.email.lower(),
        "phone": body.phone,
        "message": body.message,
        "status": "nuova",
        "notes": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": None,
    }
    await db.demo_requests.insert_one(doc)
    
    return DemoRequestResponse()


@router.get("/health")
async def health_check():
    """Simple health check for monitoring."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}
