# Multi-tenant isolation tests (Bancomanda): auth gate, public endpoints, legacy read-only,
# Napoli write flow, cross-tenant isolation, publish guard, refresh/logout, brute force.
# NEVER writes with the legacy (Giorgio Bistrot) account.
import os
import random
import uuid

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", os.environ.get("REACT_APP_BACKEND_URL")).rstrip("/")
API = f"{BASE_URL}/api"

GIORGIO = {"email": "titolare@giorgiobistrot.it", "password": "Giorgio-2XA9-ZSWF"}
NAPOLI = {"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}
ADMIN = {"email": "admin@banco.app", "password": "BancoAdmin2024!"}

FUTURE_DATE = f"2027-{random.randint(3, 11):02d}-{random.randint(10, 28):02d}"


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def giorgio():
    return _login(GIORGIO)


@pytest.fixture(scope="module")
def napoli():
    return _login(NAPOLI)


def H(tok):
    return {"Authorization": f"Bearer {tok['access_token']}"}


@pytest.fixture(scope="module")
def state():
    return {}


# ---------- Auth gate ----------
class TestAuthGate:
    @pytest.mark.parametrize("path", [
        "/orders", "/dishes", "/menus", "/customers", "/categories",
        "/kitchen?menu_date=2026-01-15", "/reports/daily-summary?date=2026-01-15",
    ])
    def test_no_auth_401(self, path):
        r = requests.get(f"{API}{path}", timeout=20)
        assert r.status_code == 401
        assert r.json().get("detail") == "Accesso richiesto"

    def test_invalid_token_401(self):
        r = requests.get(f"{API}/orders", headers={"Authorization": "Bearer xxx"}, timeout=20)
        assert r.status_code == 401

    def test_superadmin_no_tenant_401(self):
        tok = _login(ADMIN)
        r = requests.get(f"{API}/orders", headers=H(tok), timeout=20)
        assert r.status_code == 401


# ---------- Public endpoints ----------
class TestPublic:
    @pytest.mark.parametrize("path", ["/public/menu/today", "/public/menu/2026-11-05"])
    def test_public_menu_open(self, path):
        r = requests.get(f"{API}{path}", timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("date", "weekday", "published", "updated_at", "message", "sections"):
            assert k in d, k
        assert isinstance(d["sections"], list)
        for s in d["sections"]:
            for it in s.get("items", []):
                assert set(["name", "price", "tags", "allergens", "notes"]).issubset(it.keys())
                assert isinstance(it["tags"], list) and isinstance(it["allergens"], list)

    def test_landing(self):
        r = requests.get(f"{API}/landing", timeout=20)
        assert r.status_code == 200
        assert "showcase-kitchen" in r.text
        assert "app-kitchen.webp" in r.text

    @pytest.mark.parametrize("name", ["app-orders.webp", "app-menu.webp", "app-kitchen.webp"])
    def test_assets(self, name):
        r = requests.get(f"{API}/landing/assets/{name}", timeout=20)
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("image/webp")
        assert r.content[:4] == b"RIFF"

    @pytest.mark.parametrize("name", ["..%2Fserver.py", "..%2F..%2Fbackend%2Fserver.py", "nope.webp"])
    def test_asset_traversal(self, name):
        r = requests.get(f"{API}/landing/assets/{name}", timeout=20)
        assert r.status_code == 404


# ---------- Legacy read only ----------
class TestLegacyRead:
    def test_login_legacy(self, giorgio):
        assert giorgio["access_token"] and giorgio["refresh_token"]
        assert giorgio["user"]["tenant_name"] == "Giorgio Bistrot"

    def test_orders_55(self, giorgio):
        r = requests.get(f"{API}/orders?limit=500", headers=H(giorgio), timeout=20)
        assert r.status_code == 200
        assert len(r.json()) == 55

    def test_dishes_30(self, giorgio):
        r = requests.get(f"{API}/dishes", headers=H(giorgio), timeout=20)
        assert r.status_code == 200
        assert len(r.json()) == 30

    def test_other_reads(self, giorgio):
        for p in ["/menus", "/customers", "/categories", "/kitchen?menu_date=2026-01-15",
                  "/reports/daily-summary?date=2026-01-15"]:
            r = requests.get(f"{API}{p}", headers=H(giorgio), timeout=20)
            assert r.status_code == 200, (p, r.status_code, r.text[:200])


# ---------- Napoli write flow + isolation ----------
class TestNapoliFlow:
    def test_napoli_sees_no_legacy(self, napoli, giorgio, state):
        lo = requests.get(f"{API}/orders?limit=500", headers=H(giorgio), timeout=20).json()
        ld = requests.get(f"{API}/dishes?active_only=false", headers=H(giorgio), timeout=20).json()
        state["legacy_order"] = lo[0]
        state["legacy_dish"] = ld[0]
        no = requests.get(f"{API}/orders?limit=500", headers=H(napoli), timeout=20).json()
        nd = requests.get(f"{API}/dishes?active_only=false", headers=H(napoli), timeout=20).json()
        legacy_o = {o["id"] for o in lo}
        legacy_d = {d["id"] for d in ld}
        assert not (legacy_o & {o["id"] for o in no})
        assert not (legacy_d & {d["id"] for d in nd})

    def test_write_flow(self, napoli, state):
        h = H(napoli)
        sfx = uuid.uuid4().hex[:6]
        r = requests.post(f"{API}/categories", json={"name": f"TEST_Cat_{sfx}", "order": 99}, headers=h)
        assert r.status_code == 200, r.text
        cat = r.json()
        state["cat_id"] = cat["id"]

        r = requests.post(f"{API}/dishes", headers=h, json={
            "name": f"TEST_Pizza_{sfx}", "basePrice": 9.5, "categoryId": cat["id"],
            "tags": ["vegano", "Ricetta della nonna"], "allergens": ["glutine", "sesamo"]})
        assert r.status_code == 200, r.text
        dish = r.json()
        state["dish_id"] = dish["id"]
        assert dish["tags"] == ["vegano", "Ricetta della nonna"]
        assert dish["allergens"] == ["glutine", "sesamo"]
        assert dish["categoryName"] == cat["name"]

        r = requests.get(f"{API}/dishes/{dish['id']}", headers=h)
        assert r.status_code == 200 and r.json()["allergens"] == ["glutine", "sesamo"]

        r = requests.put(f"{API}/dishes/{dish['id']}", headers=h, json={"allergens": []})
        assert r.status_code == 200 and r.json()["allergens"] == []
        g = requests.get(f"{API}/dishes/{dish['id']}", headers=h).json()
        assert g["allergens"] == [] and g["tags"] == ["vegano", "Ricetta della nonna"]

        r = requests.post(f"{API}/menus", headers=h, json={"date": FUTURE_DATE})
        assert r.status_code == 200, r.text
        menu = r.json()
        state["menu_id"] = menu["id"]
        r = requests.post(f"{API}/menus/{menu['id']}/items", headers=h,
                          json={"dishId": dish["id"], "portions": 5, "dailyPrice": 10.0})
        assert r.status_code == 200, r.text
        assert any(i["dishId"] == dish["id"] for i in r.json()["items"])

        r = requests.post(f"{API}/orders?menu_date={FUTURE_DATE}", headers=h,
                          json={"channel": "telefono", "customerName": "TEST_Cliente"})
        assert r.status_code == 200, r.text
        order = r.json()
        state["order_id"] = order["id"]
        assert order["orderNumber"] == 1

        r = requests.post(f"{API}/orders/{order['id']}/items", headers=h,
                          json={"dishId": dish["id"], "quantity": 2})
        assert r.status_code == 200, r.text
        assert r.json()["total"] == 20.0

        r = requests.put(f"{API}/orders/{order['id']}/status", headers=h, json={"status": "pronto"})
        assert r.status_code == 200 and r.json()["status"] == "pronto"
        r = requests.put(f"{API}/orders/{order['id']}/payment", headers=h, json={"isPaid": False})
        assert r.status_code == 200 and r.json()["isPaid"] is False

        k = requests.get(f"{API}/kitchen?menu_date={FUTURE_DATE}", headers=h)
        assert k.status_code == 200, k.text

        lists = {
            "orders": requests.get(f"{API}/orders?limit=500", headers=h).json(),
            "dishes": requests.get(f"{API}/dishes", headers=h).json(),
            "menus": requests.get(f"{API}/menus", headers=h).json(),
            "categories": requests.get(f"{API}/categories", headers=h).json(),
        }
        assert order["id"] in {o["id"] for o in lists["orders"]}
        assert dish["id"] in {d["id"] for d in lists["dishes"]}
        assert menu["id"] in {m["id"] for m in lists["menus"]}
        assert cat["id"] in {c["id"] for c in lists["categories"]}

    def test_db_docs_have_tenant_id(self, state):
        from bson import ObjectId
        raw = MongoClient("mongodb://localhost:27017")["catering-dashboard-3"]
        tid = str(raw.tenants.find_one({"slug": "pizzeria-napoli"})["_id"])
        for col, key in [("categories", "cat_id"), ("dishes", "dish_id"),
                         ("daily_menus", "menu_id"), ("orders", "order_id")]:
            d = raw[col].find_one({"_id": ObjectId(state[key])})
            assert d and d.get("tenant_id") == tid, col

    def test_cross_tenant_legacy(self, napoli, giorgio, state):
        h = H(napoli)
        ld, lo = state["legacy_dish"], state["legacy_order"]
        assert requests.get(f"{API}/dishes/{ld['id']}", headers=h).status_code == 404
        assert requests.put(f"{API}/dishes/{ld['id']}", headers=h, json={"name": "HACK"}).status_code == 404
        assert requests.delete(f"{API}/dishes/{ld['id']}", headers=h).status_code == 404
        assert requests.get(f"{API}/orders/{lo['id']}", headers=h).status_code == 404
        assert requests.put(f"{API}/orders/{lo['id']}/status", headers=h, json={"status": "sospeso"}).status_code == 404
        assert requests.put(f"{API}/orders/{lo['id']}/payment", headers=h, json={"isPaid": not lo["isPaid"]}).status_code == 404
        assert requests.delete(f"{API}/orders/{lo['id']}", headers=h).status_code == 404
        # legacy unchanged
        g = H(giorgio)
        d2 = requests.get(f"{API}/dishes/{ld['id']}", headers=g).json()
        o2 = requests.get(f"{API}/orders/{lo['id']}", headers=g).json()
        assert d2 == ld
        assert o2 == lo

    def test_giorgio_cannot_see_napoli(self, giorgio, state):
        g = H(giorgio)
        assert requests.get(f"{API}/dishes/{state['dish_id']}", headers=g).status_code == 404
        assert requests.get(f"{API}/orders/{state['order_id']}", headers=g).status_code == 404
        assert requests.get(f"{API}/menus/{state['menu_id']}", headers=g).status_code == 404

    def test_publish_503(self, napoli, state):
        h = H(napoli)
        r = requests.patch(f"{API}/menus/{state['menu_id']}/publish", headers=h, json={"isPublished": True})
        assert r.status_code == 503
        m = requests.get(f"{API}/menus/{state['menu_id']}", headers=h).json()
        assert m["isPublished"] is False

    def test_cleanup(self, napoli, state):
        h = H(napoli)
        assert requests.delete(f"{API}/orders/{state['order_id']}", headers=h).status_code in (200, 204)
        assert requests.get(f"{API}/orders/{state['order_id']}", headers=h).status_code == 404
        assert requests.delete(f"{API}/dishes/{state['dish_id']}", headers=h).status_code == 200


# ---------- Refresh / logout ----------
class TestRefresh:
    def test_rotation_and_logout(self):
        t = _login(NAPOLI)
        r = requests.post(f"{API}/auth/refresh", json={"refresh_token": t["refresh_token"]})
        assert r.status_code == 200
        t2 = r.json()
        assert t2["refresh_token"] != t["refresh_token"] and t2["access_token"]
        assert requests.get(f"{API}/orders", headers=H(t2)).status_code == 200
        assert requests.post(f"{API}/auth/refresh", json={"refresh_token": t["refresh_token"]}).status_code == 401
        assert requests.post(f"{API}/auth/logout", json={"refresh_token": t2["refresh_token"]}).status_code == 204
        assert requests.post(f"{API}/auth/refresh", json={"refresh_token": t2["refresh_token"]}).status_code == 401

    def test_legacy_refresh_keeps_legacy(self):
        import base64, json
        t = _login(GIORGIO)
        r = requests.post(f"{API}/auth/refresh", json={"refresh_token": t["refresh_token"]})
        assert r.status_code == 200
        p = r.json()["access_token"].split(".")[1]
        claims = json.loads(base64.urlsafe_b64decode(p + "=" * (-len(p) % 4)))
        assert claims.get("legacy") is True
        assert len(requests.get(f"{API}/orders?limit=500", headers=H(r.json())).json()) == 55
        requests.post(f"{API}/auth/logout", json={"refresh_token": r.json()["refresh_token"]})


# ---------- Brute force (Napoli only) ----------
class TestBruteForce:
    def test_lockout(self):
        raw = MongoClient("mongodb://localhost:27017")["catering-dashboard-3"]
        try:
            codes = [requests.post(f"{API}/auth/login", json={"email": NAPOLI["email"], "password": "wrong!"}).status_code
                     for _ in range(5)]
            assert codes == [401] * 5, codes
            r = requests.post(f"{API}/auth/login", json=NAPOLI)
            assert r.status_code == 429
            assert "Troppi tentativi errati" in r.json()["detail"]
        finally:
            res = raw.login_attempts.delete_many({"identifier": {"$regex": ":titolare@pizzeria-napoli\\.it$"}})
            print("cleaned login_attempts:", res.deleted_count)
        assert requests.post(f"{API}/auth/login", json=NAPOLI).status_code == 200
