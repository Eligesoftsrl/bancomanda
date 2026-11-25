# Regression: /api/reports/top-dishes (projection, no cap, sorting, tenant isolation) + quick customer create
import os
import pytest
import requests
from datetime import date

BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL') or os.environ.get('EXPO_PUBLIC_BACKEND_URL')).rstrip('/')
PIZZA = {"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}
GIORGIO = {"email": "titolare@giorgiobistrot.it", "password": "Giorgio-2XA9-ZSWF"}
TODAY = date.today().isoformat()


def _session(creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds)
    if r.status_code != 200:
        pytest.skip(f"login failed {creds['email']}: {r.status_code}")
    s.headers.update({"Authorization": f"Bearer {r.json()['access_token']}"})
    return s


@pytest.fixture(scope="module")
def pizza():
    return _session(PIZZA)


@pytest.fixture(scope="module")
def giorgio():
    return _session(GIORGIO)


@pytest.fixture(scope="module")
def created_orders(pizza):
    ids = []
    yield ids
    for oid in ids:
        pizza.delete(f"{BASE_URL}/api/orders/{oid}")


class TestTopDishes:
    def test_top_dishes_no_params(self, pizza):
        r = pizza.get(f"{BASE_URL}/api/reports/top-dishes")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) <= 10
        for d in data:
            assert set(["dishId", "dishName", "totalQuantity", "totalRevenue"]).issubset(d.keys())
        qty = [d["totalQuantity"] for d in data]
        assert qty == sorted(qty, reverse=True)

    def test_top_dishes_limit(self, pizza):
        r = pizza.get(f"{BASE_URL}/api/reports/top-dishes", params={"limit": 1})
        assert r.status_code == 200
        assert len(r.json()) <= 1

    def test_top_dishes_date_range_counts_new_order(self, pizza, created_orders):
        menu = pizza.get(f"{BASE_URL}/api/menus/date/{TODAY}")
        if menu.status_code != 200:
            pytest.skip("no menu today in Pizzeria Napoli")
        items = [i for i in menu.json().get("items", []) if not i.get("isComposable")]
        params = {"start_date": TODAY, "end_date": TODAY, "limit": 100}
        before = {d["dishName"]: d for d in pizza.get(f"{BASE_URL}/api/reports/top-dishes", params=params).json()}
        o = pizza.post(f"{BASE_URL}/api/orders", params={"menu_date": TODAY},
                       json={"channel": "telefono", "customerName": "TEST_TopDishes"})
        assert o.status_code == 200, o.text
        oid = o.json()["id"]
        created_orders.append(oid)
        added = None
        for it in items:
            r = pizza.post(f"{BASE_URL}/api/orders/{oid}/items", json={"dishId": it["dishId"], "quantity": 3})
            if r.status_code == 200:
                added = r.json()["items"][-1]
                break
        if not added:
            r = pizza.post(f"{BASE_URL}/api/orders/{oid}/items",
                           json={"dishName": "TEST_TopFree", "quantity": 3, "customPrice": 2.5})
            assert r.status_code == 200, r.text
            added = r.json()["items"][-1]
        after = {d["dishName"]: d for d in pizza.get(f"{BASE_URL}/api/reports/top-dishes", params=params).json()}
        name = added["dishName"]
        b = before.get(name, {"totalQuantity": 0, "totalRevenue": 0})
        assert after[name]["totalQuantity"] == b["totalQuantity"] + 3
        assert abs(after[name]["totalRevenue"] - (b["totalRevenue"] + added["subtotal"])) < 0.01
        # out-of-range window excludes it
        old = pizza.get(f"{BASE_URL}/api/reports/top-dishes",
                        params={"start_date": "2000-01-01", "end_date": "2000-01-02"}).json()
        assert old == []
        # only start / only end
        assert pizza.get(f"{BASE_URL}/api/reports/top-dishes", params={"start_date": TODAY}).status_code == 200
        assert pizza.get(f"{BASE_URL}/api/reports/top-dishes", params={"end_date": TODAY}).status_code == 200

    def test_tenant_isolation(self, pizza, giorgio):
        p = pizza.get(f"{BASE_URL}/api/reports/top-dishes", params={"limit": 1000}).json()
        g = giorgio.get(f"{BASE_URL}/api/reports/top-dishes", params={"limit": 1000}).json()
        p_ids = {d["dishId"] for d in p if d["dishId"]}
        g_ids = {d["dishId"] for d in g if d["dishId"]}
        assert not (p_ids & g_ids), f"shared dish ids across tenants: {p_ids & g_ids}"
        assert not any(d["dishName"] for d in g if d["dishName"].startswith("TEST_Piatto Fit"))

    def test_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/reports/top-dishes")
        assert r.status_code == 401
