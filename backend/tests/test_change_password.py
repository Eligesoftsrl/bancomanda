# Change password + "logout other devices" + regression for landing assets & deploy files
import os
import json
import pytest
import requests

def _base():
    url = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                    url = line.split("=", 1)[1].strip().strip('"')
    return url.rstrip("/")

BASE_URL = _base()
EMAIL = "titolare@pizzeria-napoli.it"
PWD = "Password123!"
NEW_PWD = "TEST_NewPass456!"


def login(email, pwd):
    return requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pwd}, timeout=30)


def change(token, cur, new):
    return requests.post(f"{BASE_URL}/api/auth/change-password",
                         json={"current_password": cur, "new_password": new},
                         headers={"Authorization": f"Bearer {token}"} if token else {}, timeout=30)


def restore():
    """Restore password to PWD whatever the current one is."""
    r = login(EMAIL, PWD)
    if r.status_code == 200:
        return
    r = login(EMAIL, NEW_PWD)
    if r.status_code == 200:
        change(r.json()["access_token"], NEW_PWD, PWD)


@pytest.fixture(scope="module", autouse=True)
def _restore_at_end():
    yield
    restore()
    assert login(EMAIL, PWD).status_code == 200


# Validation errors
class TestValidation:
    def test_no_token_401(self):
        assert change(None, PWD, NEW_PWD).status_code == 401

    def test_wrong_current_400(self):
        tok = login(EMAIL, PWD).json()["access_token"]
        r = change(tok, "wrong-pass-xx", NEW_PWD)
        assert r.status_code == 400
        assert "attuale non è corretta" in r.json()["detail"]

    def test_same_as_current_400(self):
        tok = login(EMAIL, PWD).json()["access_token"]
        r = change(tok, PWD, PWD)
        assert r.status_code == 400

    def test_short_422(self):
        tok = login(EMAIL, PWD).json()["access_token"]
        assert change(tok, PWD, "short").status_code == 422


# Full flow: other sessions revoked
class TestRevocation:
    def test_change_revokes_other_sessions(self):
        a = login(EMAIL, PWD).json()
        b = login(EMAIL, PWD).json()
        # both work
        assert requests.get(f"{BASE_URL}/api/dishes", headers={"Authorization": f"Bearer {b['access_token']}"}).status_code == 200
        r = change(a["access_token"], PWD, NEW_PWD)
        assert r.status_code == 200, r.text
        new = r.json()
        assert new["access_token"] and new["refresh_token"] and new["user"]["email"] == EMAIL
        try:
            # old access tokens of A and B -> 401 on data routes
            for t in (a["access_token"], b["access_token"]):
                rr = requests.get(f"{BASE_URL}/api/dishes", headers={"Authorization": f"Bearer {t}"})
                assert rr.status_code == 401
            # old refresh tokens -> 401
            for rt in (a["refresh_token"], b["refresh_token"]):
                assert requests.post(f"{BASE_URL}/api/auth/refresh", json={"refresh_token": rt}).status_code == 401
            # new token works
            assert requests.get(f"{BASE_URL}/api/dishes", headers={"Authorization": f"Bearer {new['access_token']}"}).status_code == 200
            # new refresh works and gives a working access token
            rf = requests.post(f"{BASE_URL}/api/auth/refresh", json={"refresh_token": new["refresh_token"]})
            assert rf.status_code == 200
            assert requests.get(f"{BASE_URL}/api/dishes", headers={"Authorization": f"Bearer {rf.json()['access_token']}"}).status_code == 200
            # old password fails, new works
            assert login(EMAIL, PWD).status_code == 401
            assert login(EMAIL, NEW_PWD).status_code == 200
        finally:
            restore()
        assert login(EMAIL, PWD).status_code == 200

    def test_old_token_on_auth_me(self):
        """Info: does /api/auth/me reject a pre-change token? (not enforced by middleware)"""
        a = login(EMAIL, PWD).json()
        b = login(EMAIL, PWD).json()
        r = change(a["access_token"], PWD, NEW_PWD)
        assert r.status_code == 200
        try:
            me = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {b['access_token']}"})
            print("auth/me with stale token:", me.status_code)
            pytest.stale_me_status = me.status_code
        finally:
            restore()
        assert me.status_code == 401, "stale token still accepted by /api/auth/me"


# Regression: landing + showcase assets
class TestLanding:
    def test_landing(self):
        r = requests.get(f"{BASE_URL}/api/landing")
        assert r.status_code == 200 and "Bancomanda" in r.text

    @pytest.mark.parametrize("f", ["app-orders.webp", "app-menu.webp", "app-kitchen.webp"])
    def test_assets(self, f):
        r = requests.get(f"{BASE_URL}/api/landing/assets/{f}")
        assert r.status_code == 200 and len(r.content) > 1000


# Static review of deploy files
class TestDeployFiles:
    def test_vercel(self):
        v = json.load(open("/app/frontend/vercel.json"))
        assert v["buildCommand"] == "npx expo export --platform web"
        assert v["outputDirectory"] == "dist"

    def test_railway(self):
        d = open("/app/backend/Dockerfile.railway").read()
        assert "uvicorn server:app" in d and "${PORT" in d
        for p in ["/app/backend/Dockerfile.railway.dockerignore", "/app/backend/.env.example",
                  "/app/frontend/.env.example", "/app/DEPLOY_VERCEL_RAILWAY.md"]:
            assert os.path.exists(p), p
