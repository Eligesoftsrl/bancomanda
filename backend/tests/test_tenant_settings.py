# Tenant settings (superadmin): company data, menu messages, FTP (encrypted pwd), logo upload,
# tenant branding, publish via per-tenant FTP, public menu messages (legacy read-only).
# Writes ONLY on Pizzeria Napoli. Legacy Giorgio Bistrot is read-only.
import io
import os

import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", os.environ.get("REACT_APP_BACKEND_URL")).rstrip("/")
API = f"{BASE_URL}/api"

GIORGIO = {"email": "titolare@giorgiobistrot.it", "password": "Giorgio-2XA9-ZSWF"}
NAPOLI = {"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}
ADMIN = {"email": "admin@banco.app", "password": "BancoAdmin2024!"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def sa():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def napoli():
    return _login(NAPOLI)


@pytest.fixture(scope="module")
def giorgio():
    return _login(GIORGIO)


@pytest.fixture(scope="module")
def tenants(sa):
    r = requests.get(f"{API}/superadmin/tenants", headers=sa, timeout=20)
    assert r.status_code == 200
    by_slug = {t["slug"]: t["id"] for t in r.json()["tenants"]}
    return by_slug


@pytest.fixture(scope="module")
def nid(tenants):
    return tenants["pizzeria-napoli"]


@pytest.fixture(scope="module")
def gid(tenants):
    return tenants["giorgio-bistrot"]


def _png(w=1600, h=600, color=(220, 30, 30)):
    b = io.BytesIO()
    Image.new("RGB", (w, h), color).save(b, "PNG")
    return b.getvalue()


def _payload(**ftp):
    base_ftp = {"host": "ftp.example.invalid", "port": 21, "user": "pizza", "directory": "/www/menu/", "password": ""}
    base_ftp.update(ftp)
    return {
        "company": {"legal_name": "TEST_Pizzeria Napoli srl", "vat_number": "IT01234567890",
                    "address": "Via Roma 1, Napoli", "phone": "+39 081 000000", "email": "info@napoli.test"},
        "menu": {"closing_days": ["domenica", "lunedì"], "closing_message": "TEST chiusi oggi",
                 "pending_message": "TEST menu in arrivo"},
        "ftp": base_ftp,
    }


# ---- Auth guard ----
class TestAuthGuard:
    def test_no_token(self, nid):
        r = requests.get(f"{API}/superadmin/tenants/{nid}/settings", timeout=20)
        assert r.status_code in (401, 403)

    def test_tenant_token_forbidden(self, nid, napoli):
        r = requests.get(f"{API}/superadmin/tenants/{nid}/settings", headers=napoli, timeout=20)
        assert r.status_code in (401, 403)
        r = requests.put(f"{API}/superadmin/tenants/{nid}/settings", headers=napoli, json=_payload(), timeout=20)
        assert r.status_code in (401, 403)

    def test_unknown_tenant_404(self, sa):
        r = requests.get(f"{API}/superadmin/tenants/000000000000000000000000/settings", headers=sa, timeout=20)
        assert r.status_code == 404


# ---- Settings CRUD ----
class TestSettings:
    def test_get_structure_no_password(self, sa, nid, gid):
        for tid in (nid, gid):
            r = requests.get(f"{API}/superadmin/tenants/{tid}/settings", headers=sa, timeout=20)
            assert r.status_code == 200
            d = r.json()
            for k in ("id", "name", "slug", "company", "menu", "ftp", "logo_url"):
                assert k in d
            assert set(d["ftp"].keys()) == {"host", "port", "user", "directory", "has_password"}
            assert "password" not in r.text.lower().replace("has_password", "")

    def test_put_persist_sorted_trim_keep_password(self, sa, nid):
        r = requests.put(f"{API}/superadmin/tenants/{nid}/settings", headers=sa, json=_payload(password="secret1"), timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["menu"]["closing_days"] == ["lunedì", "domenica"]
        assert d["ftp"]["directory"] == "www/menu"
        assert d["ftp"]["has_password"] is True
        assert d["company"]["vat_number"] == "IT01234567890"
        # blank password keeps saved
        r = requests.put(f"{API}/superadmin/tenants/{nid}/settings", headers=sa, json=_payload(password=""), timeout=20)
        assert r.json()["ftp"]["has_password"] is True
        p = _payload()
        del p["ftp"]["password"]
        r = requests.put(f"{API}/superadmin/tenants/{nid}/settings", headers=sa, json=p, timeout=20)
        assert r.status_code == 200 and r.json()["ftp"]["has_password"] is True
        g = requests.get(f"{API}/superadmin/tenants/{nid}/settings", headers=sa, timeout=20).json()
        assert g["company"]["legal_name"] == "TEST_Pizzeria Napoli srl"
        assert g["menu"]["closing_message"] == "TEST chiusi oggi"
        assert g["ftp"]["host"] == "ftp.example.invalid"

    def test_invalid_day_422(self, sa, nid):
        p = _payload()
        p["menu"]["closing_days"] = ["sunday"]
        r = requests.put(f"{API}/superadmin/tenants/{nid}/settings", headers=sa, json=p, timeout=20)
        assert r.status_code == 422


# ---- FTP test ----
class TestFtpTest:
    def test_incomplete(self, sa, nid):
        r = requests.post(f"{API}/superadmin/tenants/{nid}/ftp-test", headers=sa,
                          json={"host": "", "port": 21, "user": "", "directory": "", "password": "x"}, timeout=30)
        assert r.status_code == 400
        det = r.json()["detail"]
        assert "mancano" in det and "indirizzo" in det and "utente" in det and "cartella" in det

    def test_unreachable_uses_saved_password(self, sa, nid):
        r = requests.post(f"{API}/superadmin/tenants/{nid}/ftp-test", headers=sa,
                          json={"host": "ftp.example.invalid", "port": 21, "user": "pizza", "directory": "www", "password": ""}, timeout=90)
        assert r.status_code == 400
        assert r.json()["detail"].startswith("Collegamento non riuscito")


# ---- Logo ----
class TestLogo:
    def test_upload_get_delete(self, sa, nid, napoli):
        r = requests.post(f"{API}/superadmin/tenants/{nid}/logo", headers=sa,
                          files={"file": ("logo.png", _png(), "image/png")}, timeout=30)
        assert r.status_code == 200, r.text
        url = r.json()["logo_url"]
        assert url.startswith(f"/api/public/tenant-logo/{nid}?v=")
        img = requests.get(f"{BASE_URL}{url}", timeout=20)
        assert img.status_code == 200 and img.headers["content-type"].startswith("image/png")
        im = Image.open(io.BytesIO(img.content))
        assert im.size[0] <= 800 and im.size[1] <= 400
        b = requests.get(f"{API}/tenant/branding", headers=napoli, timeout=20).json()
        assert b["name"] == "Pizzeria Napoli" and b["logo"].startswith("data:image/png;base64,")
        # delete
        r = requests.delete(f"{API}/superadmin/tenants/{nid}/logo", headers=sa, timeout=20)
        assert r.status_code == 200 and r.json()["logo_url"] is None
        assert requests.get(f"{API}/public/tenant-logo/{nid}", timeout=20).status_code == 404
        assert requests.get(f"{API}/tenant/branding", headers=napoli, timeout=20).json()["logo"] is None

    def test_jpg_webp_ok(self, sa, nid):
        for fmt, mime in (("JPEG", "image/jpeg"), ("WEBP", "image/webp")):
            b = io.BytesIO()
            Image.new("RGB", (300, 300), (10, 10, 200)).save(b, fmt)
            r = requests.post(f"{API}/superadmin/tenants/{nid}/logo", headers=sa,
                              files={"file": ("l." + fmt.lower(), b.getvalue(), mime)}, timeout=30)
            assert r.status_code == 200, (fmt, r.text)

    def test_non_image_400(self, sa, nid):
        r = requests.post(f"{API}/superadmin/tenants/{nid}/logo", headers=sa,
                          files={"file": ("x.txt", b"hello", "text/plain")}, timeout=30)
        assert r.status_code == 400

    def test_too_big_413(self, sa, nid):
        r = requests.post(f"{API}/superadmin/tenants/{nid}/logo", headers=sa,
                          files={"file": ("big.png", os.urandom(5 * 1024 * 1024 + 10), "image/png")}, timeout=60)
        assert r.status_code == 413

    def test_upload_final_logo_for_ui(self, sa, nid):
        r = requests.post(f"{API}/superadmin/tenants/{nid}/logo", headers=sa,
                          files={"file": ("logo.png", _png(), "image/png")}, timeout=30)
        assert r.status_code == 200

    def test_public_logo_invalid_id(self):
        assert requests.get(f"{API}/public/tenant-logo/abc", timeout=20).status_code == 404

    def test_branding_legacy(self, giorgio):
        r = requests.get(f"{API}/tenant/branding", headers=giorgio, timeout=20)
        assert r.status_code == 200
        assert r.json()["name"] == "Giorgio Bistrot"


# ---- Publish ----
class TestPublish:
    def _menu(self, napoli):
        r = requests.get(f"{API}/menus", headers=napoli, timeout=20)
        assert r.status_code == 200
        menus = r.json()
        assert menus, "Napoli has no menus"
        return menus[0]

    def test_publish_not_configured_503(self, sa, nid, napoli):
        m = self._menu(napoli)
        p = _payload(host="")
        requests.put(f"{API}/superadmin/tenants/{nid}/settings", headers=sa, json=p, timeout=20)
        try:
            r = requests.patch(f"{API}/menus/{m['id']}/publish", headers=napoli, json={"isPublished": True}, timeout=60)
            assert r.status_code == 503, r.text
            assert "Pubblicazione sul sito non configurata: mancano" in r.json()["detail"]
        finally:
            requests.put(f"{API}/superadmin/tenants/{nid}/settings", headers=sa, json=_payload(), timeout=20)

    def test_publish_unreachable_502_no_change(self, napoli):
        m = self._menu(napoli)
        before = m.get("isPublished")
        r = requests.patch(f"{API}/menus/{m['id']}/publish", headers=napoli, json={"isPublished": not before}, timeout=90)
        assert r.status_code == 502, r.text[:300]
        after = [x for x in requests.get(f"{API}/menus", headers=napoli, timeout=20).json() if x["id"] == m["id"]][0]
        assert after.get("isPublished") == before


# ---- Public menu message (legacy read-only) ----
class TestPublicMessages:
    def test_closing_day(self):
        d = requests.get(f"{API}/public/menu/2026-11-08", timeout=20).json()
        assert d["weekday"] == "domenica"
        if not d["published"]:
            assert d["message"] == "Siamo chiusi la domenica. Torna domani per il menu."

    def test_pending_day(self):
        d = requests.get(f"{API}/public/menu/2026-11-09", timeout=20).json()
        assert d["weekday"] == "lunedì"
        if not d["published"]:
            assert d["message"] == "Il menu del giorno arriva entro le 10:00."

    def test_today(self):
        r = requests.get(f"{API}/public/menu/today", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["published"] or isinstance(d["message"], str)
