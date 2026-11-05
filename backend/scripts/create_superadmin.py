"""
Script per creare il superadmin iniziale.
Esegui: python scripts/create_superadmin.py
"""
import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime, timezone

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env')

from motor.motor_asyncio import AsyncIOMotorClient
from auth.jwt_handler import hash_password

# Default superadmin credentials
DEFAULT_EMAIL = "admin@banco.app"
DEFAULT_PASSWORD = "BancoAdmin2024!"
DEFAULT_NAME = "Super Admin"


async def create_superadmin():
    """Create the initial superadmin user."""
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'catering-dashboard-3')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if superadmin already exists
    existing = await db.users.find_one({"role": "superadmin"})
    if existing:
        print(f"Superadmin già esistente: {existing['email']}")
        print("Per reimpostare la password, elimina manualmente l'utente dal DB.")
        client.close()
        return
    
    # Create superadmin
    now = datetime.now(timezone.utc)
    user_doc = {
        "email": DEFAULT_EMAIL,
        "name": DEFAULT_NAME,
        "password_hash": hash_password(DEFAULT_PASSWORD),
        "role": "superadmin",
        "tenant_id": None,  # Superadmin non appartiene a nessun tenant
        "disabled": False,
        "created_at": now,
        "last_login": None,
    }
    
    result = await db.users.insert_one(user_doc)
    
    print("=" * 50)
    print("SUPERADMIN CREATO CON SUCCESSO!")
    print("=" * 50)
    print(f"Email:    {DEFAULT_EMAIL}")
    print(f"Password: {DEFAULT_PASSWORD}")
    print("=" * 50)
    print("IMPORTANTE: Cambia la password dopo il primo login!")
    print("=" * 50)
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.tenants.create_index("slug", unique=True)
    await db.refresh_tokens.create_index("token_hash", unique=True)
    await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)
    
    print("Indici MongoDB creati.")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(create_superadmin())
