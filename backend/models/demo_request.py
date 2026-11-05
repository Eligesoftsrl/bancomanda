"""
Demo request model - per richieste dalla landing page.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum


class DemoRequestStatus(str, Enum):
    NEW = "nuova"
    CONTACTED = "contattata"
    CONVERTED = "convertita"  # Diventato cliente
    ARCHIVED = "archiviata"


class DemoRequestCreate(BaseModel):
    """Schema per richiesta demo dalla landing page."""
    restaurant_name: str = Field(..., min_length=2, max_length=120)
    contact_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    message: Optional[str] = Field(None, max_length=1000)


class DemoRequestUpdate(BaseModel):
    """Schema per aggiornare una richiesta (superadmin)."""
    status: Optional[DemoRequestStatus] = None
    notes: Optional[str] = None  # Note interne superadmin


class DemoRequest(DemoRequestCreate):
    """Demo request completa."""
    id: str
    status: DemoRequestStatus = DemoRequestStatus.NEW
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
