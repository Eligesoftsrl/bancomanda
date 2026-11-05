"""
JWT token handling and password hashing.
Following the integration playbook for secure auth.
"""
import os
import secrets
import hashlib
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

# JWT Configuration - loaded from environment
JWT_SECRET = os.environ.get("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_ISSUER = os.environ.get("JWT_ISSUER", "banco-api")
JWT_AUDIENCE = os.environ.get("JWT_AUDIENCE", "banco-client")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_MINUTES", "60"))  # 1 hour
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get("REFRESH_DAYS", "30"))


def hash_password(password: str) -> str:
    """
    Hash password using bcrypt.
    bcrypt accepts at most 72 bytes - we enforce this limit.
    """
    raw = password.encode("utf-8")
    if len(raw) > 72:
        raise ValueError("Password must be at most 72 UTF-8 bytes")
    if len(raw) < 8:
        raise ValueError("Password must be at least 8 characters")
    return bcrypt.hashpw(raw, bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored bcrypt hash."""
    raw = password.encode("utf-8")
    if len(raw) > 72:
        return False
    try:
        return bcrypt.checkpw(raw, stored_hash.encode())
    except Exception:
        return False


def token_hash(token: str) -> str:
    """Hash a refresh token for storage (never store plaintext)."""
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(
    user_id: str,
    email: str,
    role: str,
    tenant_id: Optional[str] = None,
    extra_claims: Optional[Dict[str, Any]] = None
) -> str:
    """
    Create a short-lived JWT access token.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "tenant_id": tenant_id,
        "type": "access",
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "jti": secrets.token_hex(16),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token() -> str:
    """Generate a secure random refresh token (opaque, not JWT)."""
    return secrets.token_urlsafe(48)


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify and decode an access token.
    Returns the claims dict if valid, None if invalid/expired.
    """
    try:
        claims = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE
        )
        if claims.get("type") != "access":
            return None
        return claims
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def verify_refresh_token(token: str, stored_hash: str) -> bool:
    """Verify a refresh token matches its stored hash."""
    return token_hash(token) == stored_hash


def get_refresh_token_expiry() -> datetime:
    """Get the expiry datetime for a new refresh token."""
    return datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
