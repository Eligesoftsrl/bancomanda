"""
Tenant model for multi-tenant SaaS.
Each tenant represents a restaurant/locale.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TenantStatus(str, Enum):
    ACTIVE = "attivo"
    PENDING = "in_attesa"  # Registrazione autonoma, attende approvazione superadmin
    SUSPENDED = "sospeso"


class FTPSettings(BaseModel):
    """FTP settings per tenant (per pubblicazione menu sul sito)."""
    host: Optional[str] = None
    user: Optional[str] = None
    port: int = 21
    directory: Optional[str] = None
    # password_encrypted è salvato nel DB ma MAI esposto via API
    has_password: bool = False  # Flag per UI


class TenantSettings(BaseModel):
    """Impostazioni personalizzabili per tenant."""
    timezone: str = "Europe/Rome"
    closing_days: List[str] = []  # Es: ["domenica"]
    closing_message: str = ""  # Messaggio da mostrare quando chiuso
    daily_categories: List[str] = ["Primi", "Secondi", "Contorni"]  # Categorie "del giorno"
    site_url: Optional[str] = None  # URL del sito del ristorante
    ftp: FTPSettings = FTPSettings()


class TenantBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    slug: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-z0-9-]+$")


class TenantCreate(TenantBase):
    """Schema per creare un tenant (da superadmin o registrazione autonoma)."""
    owner_email: EmailStr
    owner_password: str = Field(..., min_length=8, max_length=72)
    owner_name: str = Field(..., min_length=2, max_length=100)


class TenantUpdate(BaseModel):
    """Schema per aggiornare un tenant."""
    name: Optional[str] = None
    status: Optional[TenantStatus] = None
    settings: Optional[TenantSettings] = None


class Tenant(TenantBase):
    """Tenant completo (output API)."""
    id: str
    status: TenantStatus = TenantStatus.PENDING
    settings: TenantSettings = TenantSettings()
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TenantInDB(TenantBase):
    """Tenant come salvato nel DB (include campi sensibili)."""
    status: TenantStatus = TenantStatus.PENDING
    settings: dict = {}  # Serializzato come dict
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Contatore ordini atomico per tenant
    order_counter: int = 0
