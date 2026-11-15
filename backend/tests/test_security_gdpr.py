# Security + GDPR regression tests (iteration 16): consent, register w/o tokens, lockouts, verify-password, headers, CRUD after dep upgrade
import os
import time
import uuid
import io
import pytest
import requests
from pymongo import MongoClient
from bson import ObjectId

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"
SUPER = {"email": "admin@banco.app", "password": "BancoAdmin2024!"}
NAPOLI = {"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}


def _env(key):
    for line in open('/app/backend/.env'):
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"')


mongo = MongoClient(_env("MONGO_URL"))[_env("DB_NAME")]
CREATED_TENANTS = []
CREATED_DEMO_EMAILS = []


def login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def su():
    return {"Authorization": f"Bearer {login(SUPER)}"}


@pytest.fixture(scope="module")
def napoli():
    return {"Authorization": f"Bearer {login(NAPOLI)}"}


def make_tenant(su):
    uid = uuid.uuid4().hex[:8]
    body = {"name": f"TEST_Sec {uid}", "slug": f"test-sec-{uid}", "owner_email": f"test_sec_{uid}@example.com",
            "owner_name": "TEST Owner", "owner_password": "TestPass123!", "status": "attivo"}
    r = requests.post(f"{API}/superadmin/tenants", json=body, headers=su, timeout=30)
    assert r.status_code == 201, r.text
    CREATED_TENANTS.append(r.json()["id"])
    return r.json(), body


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    for tid in CREATED_TENANTS:
        users = list(mongo.users.find({"tenant_id": tid}))
        for u in users:
            mongo.login_attempts.delete_many({"identifier": {"$regex": f"{u['email']}$|{u['_id']}$"}})
            mongo.refresh_tokens.delete_many({"user_id": str(u["_id"])})
        mongo.users.delete_many({"tenant_id": tid})
        for c in ("dishes", "customers", "orders", "daily_menus", "categories"):
            mongo[c].delete_many({"tenant_id": tid})
        mongo.tenants.delete_one({"_id": ObjectId(tid)})
    for e in CREATED_DEMO_EMAILS:
        mongo.demo_requests.delete_many({"email": e})


# --- Demo request consent ---
def test_demo_request_consent_and_dedup():
    email = f"test_demo_{uuid.uuid4().hex[:8]}@example.com"
    CREATED_DEMO_EMAILS.append(email)
    body = {"restaurant_name": "TEST_Rist", "contact_name": "TEST Nome", "email": email}
    assert requests.post(f"{API}/public/demo-request", json=body, timeout=30).status_code == 422
    r = requests.post(f"{API}/public/demo-request", json={**body, "privacy_accepted": True}, timeout=30)
    assert r.status_code == 201, r.text
    r2 = requests.post(f"{API}/public/demo-request", json={**body, "privacy_accepted": True}, timeout=30)
    assert r2.status_code == 429
    doc = mongo.demo_requests.find_one({"email": email})
    assert doc and doc.get("privacy_accepted_at")


# --- Register: consent, no tokens, pending ---
def test_register_requires_consent_no_tokens_pending(su):
    uid = uuid.uuid4().hex[:8]
    body = {"email": f"test_reg_{uid}@example.com", "password": "TestPass123!", "name": "TEST Reg",
            "tenant_name": f"TEST_Reg {uid}", "tenant_slug": f"test-reg-{uid}"}
    assert requests.post(f"{API}/auth/register", json=body, timeout=30).status_code == 422
    r = requests.post(f"{API}/auth/register", json={**body, "privacy_accepted": True}, timeout=30)
    assert r.status_code == 201, r.text
    data = r.json()
    t = mongo.tenants.find_one({"slug": body["tenant_slug"]})
    CREATED_TENANTS.append(str(t["_id"]))
    assert data.get("success") is True and data.get("message")
    assert "access_token" not in data and "refresh_token" not in data
    assert t["status"] == "in_attesa"
    lr = requests.post(f"{API}/auth/login", json={"email": body["email"], "password": body["password"]}, timeout=30)
    assert lr.status_code == 403
    # activate -> login ok
    pr = requests.patch(f"{API}/superadmin/tenants/{t['_id']}/status", json={"status": "attivo"}, headers=su, timeout=30)
    assert pr.status_code == 200, pr.text
    lr2 = requests.post(f"{API}/auth/login", json={"email": body["email"], "password": body["password"]}, timeout=30)
    assert lr2.status_code == 200


# --- Login lockout on throwaway tenant ---
def test_login_lockout(su):
    _, body = make_tenant(su)
    codes = [requests.post(f"{API}/auth/login", json={"email": body["owner_email"], "password": "wrong-pass-x"}, timeout=30).status_code
             for _ in range(12)]
    print(codes)
    assert 429 in codes
    assert codes.index(429) <= 10
    # even correct password now locked
    r = requests.post(f"{API}/auth/login", json={"email": body["owner_email"], "password": body["owner_password"]}, timeout=30)
    assert r.status_code == 429


# --- verify-password ---
def test_verify_password(su):
    _, body = make_tenant(su)
    tok = login({"email": body["owner_email"], "password": body["owner_password"]})
    h = {"Authorization": f"Bearer {tok}"}
    r = requests.post(f"{API}/auth/verify-password", json={"password": body["owner_password"]}, headers=h, timeout=30)
    assert r.status_code == 200 and r.json() == {"ok": True}
    r = requests.post(f"{API}/auth/verify-password", json={"password": "eligesoft"}, headers=h, timeout=30)
    assert r.status_code == 401 and r.json()["detail"] == "Password non corretta"
    codes = [requests.post(f"{API}/auth/verify-password", json={"password": "bad"}, headers=h, timeout=30).status_code for _ in range(5)]
    print(codes)
    assert codes[-1] == 429
    assert requests.post(f"{API}/auth/verify-password", json={"password": "x"}, timeout=30).status_code in (401, 403)


# --- Security headers ---
@pytest.mark.parametrize("path,auth", [("/landing", False), ("/legal/privacy", False), ("/admin/dashboard", False), ("/public/menu/today", False)])
def test_security_headers(path, auth):
    r = requests.get(f"{API}{path}", timeout=30)
    h = {k.lower(): v for k, v in r.headers.items()}
    assert h.get("x-content-type-options") == "nosniff"
    assert h.get("x-frame-options") == "DENY"
    assert "referrer-policy" in h
    assert "strict-transport-security" in h
    assert "permissions-policy" in h
    if path in ("/landing", "/legal/privacy", "/admin/dashboard"):
        assert "content-security-policy" in h, path


def test_setup_status_no_database_field(napoli):
    r = requests.get(f"{API}/setup/status", headers=napoli, timeout=30)
    assert r.status_code == 200
    assert "database" not in r.json()


def test_login_attempts_indexes():
    idx = mongo.login_attempts.index_information()
    print(idx)
    assert len(idx) > 1


# --- Regression CRUD with Napoli after dep upgrade ---
def test_dish_crud(napoli):
    r = requests.post(f"{API}/dishes", json={"name": "TEST_Piatto sec", "basePrice": 5.5}, headers=napoli, timeout=30)
    assert r.status_code in (200, 201), r.text
    did = r.json().get("id")
    assert did
    g = requests.get(f"{API}/dishes", headers=napoli, timeout=30)
    assert g.status_code == 200 and any(d.get("id") == did for d in g.json())
    u = requests.put(f"{API}/dishes/{did}", json={"basePrice": 6.0}, headers=napoli, timeout=30)
    assert u.status_code == 200 and u.json()["basePrice"] == 6.0, u.text
    d = requests.delete(f"{API}/dishes/{did}", headers=napoli, timeout=30)
    assert d.status_code in (200, 204)


def test_customer_crud(napoli):
    r = requests.post(f"{API}/customers", json={"name": "TEST_Cliente sec", "phone": "3330000000"}, headers=napoli, timeout=30)
    assert r.status_code in (200, 201), r.text
    cid = r.json().get("id")
    try:
        s = requests.get(f"{API}/customers", params={"search": "TEST_Cliente sec"}, headers=napoli, timeout=30)
        assert s.status_code == 200
        u = requests.put(f"{API}/customers/{cid}", json={"name": "TEST_Cliente sec2"}, headers=napoli, timeout=30)
        assert u.status_code == 200, u.text
    finally:
        mongo.customers.delete_one({"_id": ObjectId(cid)})


def test_order_create_delete(napoli):
    menus = requests.get(f"{API}/menus", headers=napoli, timeout=30).json()
    if not menus:
        pytest.skip("no menu for Napoli")
    r = requests.post(f"{API}/orders", params={"menu_date": menus[0]["date"]}, json={"channel": "banco", "customerName": "TEST_Ord"}, headers=napoli, timeout=30)
    assert r.status_code in (200, 201), r.text
    oid = r.json()["id"]
    d = requests.delete(f"{API}/orders/{oid}", headers=napoli, timeout=30)
    assert d.status_code in (200, 204), d.text


def test_orders_menus_reports(napoli):
    today = time.strftime("%Y-%m-%d")
    for p in ["/orders", "/menus", f"/reports/daily-summary?date={today}"]:
        r = requests.get(f"{API}{p}", headers=napoli, timeout=30)
        print(p, r.status_code)
        assert r.status_code == 200, f"{p} {r.status_code} {r.text[:200]}"


def test_logo_upload_multipart(su):
    t, _ = make_tenant(su)
    try:
        from PIL import Image
        buf = io.BytesIO()
        Image.new("RGB", (64, 64), (200, 30, 30)).save(buf, format="PNG")
        data = buf.getvalue()
    except ImportError:
        pytest.skip("PIL missing")
    r = requests.post(f"{API}/superadmin/tenants/{t['id']}/logo", files={"file": ("logo.png", data, "image/png")}, headers=su, timeout=30)
    assert r.status_code == 200, r.text
    lg = requests.get(f"{API}/public/tenant-logo/{t['id']}", timeout=30)
    assert lg.status_code == 200
    dr = requests.delete(f"{API}/superadmin/tenants/{t['id']}/logo", headers=su, timeout=30)
    assert dr.status_code == 200
