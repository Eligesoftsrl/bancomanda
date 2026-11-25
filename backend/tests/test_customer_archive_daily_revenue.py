# Customer archive/restore (scope, stats, isolation) + daily revenue report tests
import os
import pytest
import requests

BASE_URL = (os.environ.get('EXPO_PUBLIC_BACKEND_URL') or os.environ.get('REACT_APP_BACKEND_URL')).rstrip('/')
PIZZA = {"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}
LEGACY = {"email": "titolare@giorgiobistrot.it", "password": "Giorgio-2XA9-ZSWF"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code}")
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {r.json()['access_token']}"})
    return s


@pytest.fixture(scope="module")
def pz():
    return _login(PIZZA)


@pytest.fixture(scope="module")
def legacy():
    return _login(LEGACY)


@pytest.fixture(scope="module")
def test_customer(pz):
    r = pz.post(f"{BASE_URL}/api/customers", json={"name": "TEST_Archivio Cliente", "customerType": "privato"})
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    yield cid
    # No DELETE /customers endpoint: remove the created TEST_ customer by id directly in Mongo
    pz.post(f"{BASE_URL}/api/customers/restore", json={"ids": [cid]})
    if os.environ.get("MONGO_URL"):
        from pymongo import MongoClient
        from bson import ObjectId
        MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]].customers.delete_one(
            {"_id": ObjectId(cid), "name": "TEST_Archivio Cliente"})


def _ids(s, scope=None):
    url = f"{BASE_URL}/api/customers" + (f"?scope={scope}" if scope else "")
    r = s.get(url)
    assert r.status_code == 200
    return {c["id"] for c in r.json()}


# --- Customers scope / stats ---
class TestCustomerScope:
    def test_invalid_scope(self, pz):
        r = pz.get(f"{BASE_URL}/api/customers?scope=xx")
        assert r.status_code == 400
        assert r.json()["detail"] == "Filtro non valido"

    def test_with_stats(self, pz):
        r = pz.get(f"{BASE_URL}/api/customers?scope=all&with_stats=true")
        assert r.status_code == 200
        sec = [c for c in r.json() if c["name"] == "TEST_Cliente sec"]
        assert sec and sec[0]["lastOrderDate"] == "2026-03-02"
        assert sec[0]["ordersCount"] >= 1

    def test_archive_restore_flow(self, pz, test_customer):
        assert test_customer in _ids(pz)
        r = pz.post(f"{BASE_URL}/api/customers/archive", json={"ids": [test_customer]})
        assert r.status_code == 200 and r.json()["archived"] == 1
        assert test_customer not in _ids(pz)
        assert test_customer not in _ids(pz, "active")
        assert test_customer in _ids(pz, "archived")
        assert test_customer in _ids(pz, "all")
        arch = [c for c in pz.get(f"{BASE_URL}/api/customers?scope=archived").json() if c["id"] == test_customer][0]
        assert arch["archived"] is True and arch["archivedAt"]
        r = pz.post(f"{BASE_URL}/api/customers/restore", json={"ids": [test_customer]})
        assert r.status_code == 200 and r.json()["restored"] == 1
        assert test_customer in _ids(pz)
        assert test_customer not in _ids(pz, "archived")

    def test_invalid_id(self, pz):
        assert pz.post(f"{BASE_URL}/api/customers/archive", json={"ids": ["bad"]}).status_code == 400
        assert pz.post(f"{BASE_URL}/api/customers/restore", json={"ids": ["bad"]}).status_code == 400

    def test_empty_list(self, pz):
        assert pz.post(f"{BASE_URL}/api/customers/archive", json={"ids": []}).status_code == 422
        assert pz.post(f"{BASE_URL}/api/customers/restore", json={"ids": []}).status_code == 422

    def test_unauth(self):
        assert requests.post(f"{BASE_URL}/api/customers/archive", json={"ids": ["a" * 24]}).status_code == 401

    def test_cross_tenant_isolation(self, pz, legacy):
        lc = legacy.get(f"{BASE_URL}/api/customers?scope=all").json()
        if not lc:
            pytest.skip("no legacy customers")
        target = lc[0]
        r = pz.post(f"{BASE_URL}/api/customers/archive", json={"ids": [target["id"]]})
        assert r.status_code == 200 and r.json()["archived"] == 0
        after = [c for c in legacy.get(f"{BASE_URL}/api/customers?scope=all").json() if c["id"] == target["id"]][0]
        assert after.get("archived") == target.get("archived")
        r = pz.post(f"{BASE_URL}/api/customers/restore", json={"ids": [target["id"]]})
        assert r.json()["restored"] == 0
        # pz stats must not include legacy customers
        assert target["id"] not in _ids(pz, "all")


# --- Daily revenue ---
class TestDailyRevenue:
    def test_days_and_sum(self, pz):
        s, e = "2026-10-20", "2026-11-25"
        r = pz.get(f"{BASE_URL}/api/reports/daily-revenue", params={"start_date": s, "end_date": e})
        assert r.status_code == 200
        days = r.json()
        assert len(days) == 37
        assert days[0]["date"] == s and days[-1]["date"] == e
        assert any(d["totalOrders"] == 0 for d in days)
        summ = pz.get(f"{BASE_URL}/api/reports/range-summary", params={"start_date": s, "end_date": e}).json()
        assert sum(d["totalOrders"] for d in days) == summ["totalOrders"]
        assert abs(sum(d["totalRevenue"] for d in days) - summ["totalRevenue"]) < 0.05
        assert summ["totalOrders"] >= 80

    def test_single_day(self, pz):
        r = pz.get(f"{BASE_URL}/api/reports/daily-revenue", params={"start_date": "2026-03-02", "end_date": "2026-03-02"})
        assert r.status_code == 200 and len(r.json()) == 1 and r.json()[0]["totalOrders"] >= 1

    def test_errors(self, pz):
        u = f"{BASE_URL}/api/reports/daily-revenue"
        assert pz.get(u, params={"start_date": "2026-11-10", "end_date": "2026-11-01"}).status_code == 400
        assert pz.get(u, params={"start_date": "2023-01-01", "end_date": "2026-01-01"}).status_code == 400
        assert pz.get(u, params={"start_date": "2026-13-01", "end_date": "2026-11-01"}).status_code == 400
        assert pz.get(u, params={"start_date": "abc", "end_date": "2026-11-01"}).status_code == 400
        assert pz.get(u, params={"start_date": "2026-11-01"}).status_code == 422
        assert requests.get(u, params={"start_date": "2026-11-01", "end_date": "2026-11-02"}).status_code == 401

    def test_legacy_isolation(self, legacy):
        r = legacy.get(f"{BASE_URL}/api/reports/daily-revenue", params={"start_date": "2026-10-26", "end_date": "2026-11-24"})
        assert r.status_code == 200
        # TEST_Grafico orders belong to Pizzeria Napoli -> must not inflate legacy totals
        summ = legacy.get(f"{BASE_URL}/api/reports/range-summary", params={"start_date": "2026-10-26", "end_date": "2026-11-24"}).json()
        assert sum(d["totalOrders"] for d in r.json()) == summ["totalOrders"]
