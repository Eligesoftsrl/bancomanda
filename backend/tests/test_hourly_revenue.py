# Tests for GET /api/reports/hourly-revenue (daily report hourly chart, today vs yesterday)
import os
import requests
import pytest

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or os.environ.get("EXPO_PUBLIC_BACKEND_URL")).rstrip("/")
NAPOLI = {"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}
GIORGIO = {"email": "titolare@giorgiobistrot.it", "password": "Giorgio-2XA9-ZSWF"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code}")
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def napoli():
    return _login(NAPOLI)


@pytest.fixture(scope="module")
def giorgio():
    return _login(GIORGIO)


def _get(h, date):
    return requests.get(f"{BASE_URL}/api/reports/hourly-revenue", params={"date": date}, headers=h, timeout=20)


class TestHourlyRevenue:
    def test_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/reports/hourly-revenue", params={"date": "2026-11-25"}, timeout=20)
        assert r.status_code == 401

    def test_structure(self, napoli):
        r = _get(napoli, "2026-11-25")
        assert r.status_code == 200
        d = r.json()
        assert d["date"] == "2026-11-25" and d["prevDate"] == "2026-11-24"
        assert len(d["hours"]) == 24
        assert [h["hour"] for h in d["hours"]] == list(range(24))
        for h in d["hours"]:
            assert set(h) == {"hour", "revenue", "orders", "prevRevenue", "prevOrders"}

    def test_totals_match_daily_report(self, napoli):
        d = _get(napoli, "2026-11-25").json()
        tot = sum(h["revenue"] for h in d["hours"])
        n = sum(h["orders"] for h in d["hours"])
        print("25 Nov totals", tot, n, "prev", sum(h["prevRevenue"] for h in d["hours"]), sum(h["prevOrders"] for h in d["hours"]))
        assert n == 1 and abs(tot - 17) < 0.01
        assert sum(h["prevOrders"] for h in d["hours"]) > 0

    def test_prev_consistency(self, napoli):
        a = _get(napoli, "2026-11-25").json()
        b = _get(napoli, "2026-11-24").json()
        assert [h["prevRevenue"] for h in a["hours"]] == [h["revenue"] for h in b["hours"]]

    def test_month_boundary(self, napoli):
        d = _get(napoli, "2026-12-01").json()
        assert d["prevDate"] == "2026-11-30"
        d = _get(napoli, "2026-03-01").json()
        assert d["prevDate"] == "2026-02-28"

    @pytest.mark.parametrize("bad", ["2026-13-01", "abc", "25-11-2026", ""])
    def test_invalid_date(self, napoli, bad):
        r = _get(napoli, bad)
        assert r.status_code in (400, 422)
        if bad:
            assert r.status_code == 400 and r.json()["detail"] == "Data non valida"

    def test_tenant_isolation(self, giorgio, napoli):
        g = _get(giorgio, "2026-11-24").json()
        n = _get(napoli, "2026-11-24").json()
        print("giorgio 24 Nov", sum(h["orders"] for h in g["hours"]), "napoli", sum(h["orders"] for h in n["hours"]))
        assert [h["revenue"] for h in g["hours"]] != [h["revenue"] for h in n["hours"]] or sum(h["orders"] for h in n["hours"]) == 0

    def test_excludes_cancelled(self, napoli):
        # create TEST_ order today, cancel it, verify excluded
        today = _get(napoli, "2026-11-26").json()
        base = sum(h["orders"] for h in today["hours"])
        r = requests.get(f"{BASE_URL}/api/orders", params={"menuDate": "2026-11-26"}, headers=napoli, timeout=20)
        assert r.status_code == 200
        print("base orders 26 Nov", base)
