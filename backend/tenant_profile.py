"""Impostazioni per locale: password FTP cifrata, pubblicazione menu.json, messaggi del menu, logo."""
import base64
import ftplib
import hashlib
import io
import json
import logging
import os
from typing import Optional

from bson import ObjectId
from cryptography.fernet import Fernet, InvalidToken
from PIL import Image

from tenancy import get_tenant

logger = logging.getLogger(__name__)

WEEKDAYS = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"]
MENU_FILENAME = "menu.json"
DEFAULT_CLOSING_MESSAGE = "Oggi siamo chiusi. Torna domani per il menu."
DEFAULT_PENDING_MESSAGE = "Il menu del giorno non è ancora disponibile."
MAX_LOGO_BYTES = 5 * 1024 * 1024
LOGO_BOX = (800, 400)


class FtpNotConfigured(Exception):
    pass


def _fernet() -> Fernet:
    secret = os.environ["JWT_SECRET"].encode()
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(b"bancomanda-settings-v1:" + secret).digest()))


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt_secret(token: str) -> Optional[str]:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        logger.warning("Password FTP non decifrabile (chiave cambiata?): va reinserita")
        return None


async def current_tenant_doc(raw_db) -> Optional[dict]:
    ctx = get_tenant()
    if ctx.tenant_id and ObjectId.is_valid(ctx.tenant_id):
        return await raw_db.tenants.find_one({"_id": ObjectId(ctx.tenant_id)})
    if ctx.legacy:
        return await raw_db.tenants.find_one({"legacy_data": True})
    return None


def menu_message(settings: dict, weekday: Optional[str]) -> str:
    if weekday and weekday in (settings.get("closing_days") or []):
        return settings.get("closing_message") or DEFAULT_CLOSING_MESSAGE
    return settings.get("menu_pending_message") or DEFAULT_PENDING_MESSAGE


def ftp_config(ftp: Optional[dict], password: Optional[str] = None) -> dict:
    ftp = ftp or {}
    host = (ftp.get("host") or "").strip()
    user = (ftp.get("user") or "").strip()
    folder = (ftp.get("directory") or "").strip().strip("/")
    port = int(ftp.get("port") or 21)
    if not password and ftp.get("password_encrypted"):
        password = decrypt_secret(ftp["password_encrypted"])
    missing = [label for label, value in (("indirizzo", host), ("utente", user), ("password", password), ("cartella", folder)) if not value]
    if missing:
        raise FtpNotConfigured("Pubblicazione sul sito non configurata: mancano " + ", ".join(missing) + " FTP nell'area admin")
    for prefix in ("ftp://", "ftps://", "sftp://"):
        if host.lower().startswith(prefix):
            host = host[len(prefix):]
    host = host.rstrip("/")
    if ":" in host:
        host, port_str = host.rsplit(":", 1)
        port = int(port_str)
    return {"host": host, "port": port, "user": user, "password": password, "folder": folder}


def ftp_open(cfg: dict) -> ftplib.FTP:
    """Prova prima FTPS (connessione cifrata), se il server non lo supporta usa FTP semplice."""
    try:
        ftp = ftplib.FTP_TLS(timeout=20)
        ftp.connect(cfg["host"], cfg["port"])
        ftp.login(cfg["user"], cfg["password"])
        ftp.prot_p()
        return ftp
    except Exception as e:
        logger.info(f"FTPS non disponibile ({e}), uso FTP semplice")
        try:
            ftp.close()
        except Exception:
            pass
    ftp = ftplib.FTP(timeout=20)
    ftp.connect(cfg["host"], cfg["port"])
    ftp.login(cfg["user"], cfg["password"])
    return ftp


def _close(ftp: ftplib.FTP):
    try:
        ftp.quit()
    except Exception:
        ftp.close()


def ftp_upload_menu_json(cfg: dict, public_payload: dict) -> str:
    data = json.dumps(public_payload, ensure_ascii=False, indent=2).encode("utf-8")
    ftp = ftp_open(cfg)
    try:
        for part in cfg["folder"].split("/"):
            try:
                ftp.cwd(part)
            except ftplib.error_perm:
                ftp.mkd(part)
                ftp.cwd(part)
        # Upload su file temporaneo + rinomina: il sito non legge mai un file a metà
        tmp_name = MENU_FILENAME + ".tmp"
        ftp.storbinary(f"STOR {tmp_name}", io.BytesIO(data))
        try:
            ftp.rename(tmp_name, MENU_FILENAME)
        except ftplib.error_perm:
            ftp.delete(MENU_FILENAME)
            ftp.rename(tmp_name, MENU_FILENAME)
    finally:
        _close(ftp)
    return f"/{cfg['folder']}/{MENU_FILENAME}"


def ftp_test(cfg: dict) -> str:
    ftp = ftp_open(cfg)
    try:
        for part in cfg["folder"].split("/"):
            try:
                ftp.cwd(part)
            except ftplib.error_perm:
                return f"Accesso riuscito. La cartella '{cfg['folder']}' non esiste ancora: verrà creata alla prima pubblicazione."
        return f"Accesso riuscito. Il menu verrà salvato in /{cfg['folder']}/{MENU_FILENAME}"
    finally:
        _close(ftp)


def process_logo(raw: bytes) -> bytes:
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except Exception:
        raise ValueError("Il file non è un'immagine valida (usa PNG, JPG o WEBP)")
    img = img.convert("RGBA")
    img.thumbnail(LOGO_BOX)
    out = io.BytesIO()
    img.save(out, "PNG", optimize=True)
    return out.getvalue()


def logo_data_url(data: bytes) -> str:
    return "data:image/png;base64," + base64.b64encode(data).decode()
