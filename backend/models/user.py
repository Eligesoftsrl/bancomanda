"""
User model for multi-tenant auth.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    SUPERADMIN = "superadmin"      # Gestisce tutti i tenant
    TENANT_ADMIN = "tenant_admin"  # Admin di un singolo tenant (titolare)
    STAFF = "staff"                # Staff di un tenant


class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)


class UserCreate(UserBase):
    """Schema per registrazione utente."""
    password: str = Field(..., min_length=8, max_length=72)
    tenant_id: Optional[str] = None  # None per superadmin
    role: UserRole = UserRole.STAFF


class UserLogin(BaseModel):
    """Schema per login."""
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Schema per aggiornare un utente."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    disabled: Optional[bool] = None
    role: Optional[UserRole] = None


class UserChangePassword(BaseModel):
    """Schema per cambio password."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=72)


class User(UserBase):
    """User output (senza password)."""
    id: str
    tenant_id: Optional[str] = None
    role: UserRole
    disabled: bool = False
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserInDB(UserBase):
    """User come salvato nel DB (include password hash)."""
    password_hash: str
    tenant_id: Optional[str] = None
    role: UserRole = UserRole.STAFF
    disabled: bool = False
    created_at: datetime
    last_login: Optional[datetime] = None
