# Multi-tenant SaaS: auth, superadmin tenant mgmt, demo requests, landing/dashboard HTML
import os
import uuid
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or os.environ.get("EXPO_PUBLIC_BACKEND_URL")).rstrip("/")
SA = {"email": "admin@banco.app", "password": "BancoAdmin2024!"}
TENANT = {"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}


def _login(creds):
    return requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=20)


@pytest.fixture(scope="module")
def sa_headers():
    r = _login(SA)
    if r.status_code != 200:
        pytest.skip(f"superadmin login failed {r.status_code} {r.text}")
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ---- HTML pages ----
class TestPages:
    def test_landing(self):
        r = requests.get(f"{BASE_URL}/api/landing", timeout=20)
        assert r.status_code == 200
        assert "text/html" in r.headers.get("content-type", "")
        assert "<html" in r.text.lower()

    def test_dashboard(self):
        r = requests.get(f"{BASE_URL}/api/admin/dashboard", timeout=20)
        assert r.status_code == 200
        assert "text/html" in r.headers.get("content-type", "")

    def test_health(self):
        r = requests.get(f"{BASE_URL}/api/public/health", timeout=20)
        assert r.status_code == 200 and r.json()["status"] == "ok"


# ---- Auth ----
class TestAuth:
    def test_superadmin_login(self):
        r = _login(SA)
        assert r.status_code == 200
        d = r.json()
        assert d["token_type"] == "bearer" and d["expires_in"] == 3600
        assert d["user"]["role"] == "superadmin"
        assert d["user"]["tenant_id"] is None
        assert isinstance(d["refresh_token"], str) and len(d["refresh_token"]) > 20

    def test_tenant_login(self):
        r = _login(TENANT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["role"] == "tenant_admin"
        assert isinstance(d["user"]["tenant_id"], str) and d["user"]["tenant_id"]
        assert d["user"]["tenant_name"] == "Pizzeria Napoli"

    def test_login_wrong_password(self):
        r = _login({"email": SA["email"], "password": "wrongpass123"})
        assert r.status_code == 401
        assert "detail" in r.json()

    def test_login_case_insensitive_email(self):
        r = _login({"email": SA["email"].upper(), "password": SA["password"]})
        assert r.status_code == 200

    def test_me_and_refresh_and_logout(self):
        d = _login(TENANT).json()
        me = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {d['access_token']}"})
        assert me.status_code == 200 and me.json()["email"] == TENANT["email"]
        rf = requests.post(f"{BASE_URL}/api/auth/refresh", json={"refresh_token": d["refresh_token"]})
        assert rf.status_code == 200
        new_rt = rf.json()["refresh_token"]
        # old refresh token single-use
        again = requests.post(f"{BASE_URL}/api/auth/refresh", json={"refresh_token": d["refresh_token"]})
        assert again.status_code == 401
        lo = requests.post(f"{BASE_URL}/api/auth/logout", json={"refresh_token": new_rt})
        assert lo.status_code == 204
        after = requests.post(f"{BASE_URL}/api/auth/refresh", json={"refresh_token": new_rt})
        assert after.status_code == 401

    def test_me_no_token(self):
        assert requests.get(f"{BASE_URL}/api/auth/me").status_code == 401

    def test_tenant_cannot_access_superadmin(self):
        tok = _login(TENANT).json()["access_token"]
        r = requests.get(f"{BASE_URL}/api/superadmin/stats", headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 403


# ---- Registration + tenant lifecycle ----
class TestTenantLifecycle:
    def test_register_activate_suspend_flow(self, sa_headers):
        suf = uuid.uuid4().hex[:8]
        email = f"test_owner_{suf}@example.com"
        pwd = "TestPass123!"
        reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": pwd, "name": "TEST Owner",
            "tenant_name": f"TEST_Locale {suf}", "tenant_slug": f"test-locale-{suf}"})
        assert reg.status_code == 201, reg.text
        tid = reg.json()["user"]["tenant_id"]
        assert reg.json()["user"]["role"] == "tenant_admin"

        # pending -> login blocked
        r = _login({"email": email, "password": pwd})
        assert r.status_code == 403

        # duplicates
        dup = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": pwd, "name": "TEST Owner",
            "tenant_name": "TEST_x", "tenant_slug": f"other-{suf}"})
        assert dup.status_code == 409

        # appears in pending filter
        lst = requests.get(f"{BASE_URL}/api/superadmin/tenants?status=in_attesa", headers=sa_headers).json()
        assert any(t["id"] == tid for t in lst["tenants"])
        assert all(t["status"] == "in_attesa" for t in lst["tenants"])

        # activate
        a = requests.patch(f"{BASE_URL}/api/superadmin/tenants/{tid}/status", json={"status": "attivo"}, headers=sa_headers)
        assert a.status_code == 200 and a.json()["status"] == "attivo"
        assert a.json()["owner_email"] == email
        r = _login({"email": email, "password": pwd})
        assert r.status_code == 200 and r.json()["user"]["tenant_id"] == tid

        # suspend
        s = requests.patch(f"{BASE_URL}/api/superadmin/tenants/{tid}/status", json={"status": "sospeso"}, headers=sa_headers)
        assert s.status_code == 200 and s.json()["status"] == "sospeso"
        assert _login({"email": email, "password": pwd}).status_code == 403

        # reactivate
        ra = requests.patch(f"{BASE_URL}/api/superadmin/tenants/{tid}/status", json={"status": "attivo"}, headers=sa_headers)
        assert ra.status_code == 200
        assert _login({"email": email, "password": pwd}).status_code == 200
        # leave TEST tenant suspended at end to avoid polluting active list
        requests.patch(f"{BASE_URL}/api/superadmin/tenants/{tid}/status", json={"status": "sospeso"}, headers=sa_headers)

    def test_register_validation(self):
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test_x@example.com", "password": "short", "name": "AB"})
        assert r.status_code == 422
        r2 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com", "password": "TestPass123!", "name": "AB"})
        assert r2.status_code == 400

    def test_superadmin_create_tenant(self, sa_headers):
        suf = uuid.uuid4().hex[:8]
        r = requests.post(f"{BASE_URL}/api/superadmin/tenants", headers=sa_headers, json={
            "name": f"TEST_SA {suf}", "slug": f"test-sa-{suf}", "owner_email": f"test_sa_{suf}@example.com",
            "owner_password": "TestPass123!", "owner_name": "TEST SA Owner", "status": "attivo"})
        assert r.status_code == 201, r.text
        tid = r.json()["id"]
        assert _login({"email": f"test_sa_{suf}@example.com", "password": "TestPass123!"}).status_code == 200
        requests.patch(f"{BASE_URL}/api/superadmin/tenants/{tid}/status", json={"status": "sospeso"}, headers=sa_headers)

    def test_invalid_tenant_id(self, sa_headers):
        r = requests.patch(f"{BASE_URL}/api/superadmin/tenants/notanid/status", json={"status": "attivo"}, headers=sa_headers)
        assert r.status_code in (400, 404, 422), f"got {r.status_code}"

    def test_nonexistent_tenant_id(self, sa_headers):
        r = requests.patch(f"{BASE_URL}/api/superadmin/tenants/000000000000000000000000/status", json={"status": "attivo"}, headers=sa_headers)
        assert r.status_code == 404


# ---- Demo requests ----
class TestDemoRequests:
    def test_demo_request_flow(self, sa_headers):
        suf = uuid.uuid4().hex[:8]
        email = f"test_demo_{suf}@example.com"
        before = requests.get(f"{BASE_URL}/api/superadmin/stats", headers=sa_headers).json()
        r = requests.post(f"{BASE_URL}/api/public/demo-request", json={
            "restaurant_name": f"TEST_Rist {suf}", "contact_name": "TEST Mario", "email": email,
            "phone": "3331234567", "message": "test"})
        assert r.status_code == 201 and r.json()["success"] is True
        dup = requests.post(f"{BASE_URL}/api/public/demo-request", json={
            "restaurant_name": f"TEST_Rist {suf}", "contact_name": "TEST Mario", "email": email})
        assert dup.status_code == 429
        after = requests.get(f"{BASE_URL}/api/superadmin/stats", headers=sa_headers).json()
        assert after["total_demo_requests"] == before["total_demo_requests"] + 1
        lst = requests.get(f"{BASE_URL}/api/superadmin/demo-requests?status=nuova", headers=sa_headers).json()
        item = next(x for x in lst["requests"] if x["email"] == email)
        u = requests.patch(f"{BASE_URL}/api/superadmin/demo-requests/{item['id']}", headers=sa_headers,
                           json={"status": "contattata", "notes": "TEST note"})
        assert u.status_code == 200 and u.json()["status"] == "contattata" and u.json()["notes"] == "TEST note"
        lst2 = requests.get(f"{BASE_URL}/api/superadmin/demo-requests?status=contattata", headers=sa_headers).json()
        assert any(x["id"] == item["id"] for x in lst2["requests"])
        # archive at end
        requests.patch(f"{BASE_URL}/api/superadmin/demo-requests/{item['id']}", headers=sa_headers, json={"status": "archiviata"})

    def test_demo_request_validation(self):
        r = requests.post(f"{BASE_URL}/api/public/demo-request", json={"restaurant_name": "X", "contact_name": "Y", "email": "bad"})
        assert r.status_code == 422

    def test_invalid_demo_id(self, sa_headers):
        r = requests.patch(f"{BASE_URL}/api/superadmin/demo-requests/bad-id", headers=sa_headers, json={"status": "contattata"})
        assert r.status_code in (400, 404, 422), f"got {r.status_code}"

    def test_stats_shape(self, sa_headers):
        d = requests.get(f"{BASE_URL}/api/superadmin/stats", headers=sa_headers).json()
        for k in ["total_tenants", "active_tenants", "pending_tenants", "suspended_tenants", "total_demo_requests", "new_demo_requests"]:
            assert isinstance(d[k], int)
        assert d["total_tenants"] >= d["active_tenants"] + d["pending_tenants"] + d["suspended_tenants"] - 0
