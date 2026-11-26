# Piatti componibili (composable dishes): option groups CRUD, dishes, daily menu esaurito,
# orders composition/pricing, PATCH recompute, kitchen/porzionatura, public payload, cross-tenant.
# Writes ONLY with Pizzeria Napoli + a TEST_ tenant B. Never touches giorgio-bistrot.
import os
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", os.environ.get("REACT_APP_BACKEND_URL")).rstrip("/")
API = f"{BASE_URL}/api"
NAPOLI = {"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}
ADMIN = {"email": "admin@banco.app", "password": "BancoAdmin2024!"}
TODAY = datetime.now(ZoneInfo("Europe/Rome")).strftime("%Y-%m-%d")
SUF = uuid.uuid4().hex[:6]


def _h(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def H():
    return _h(NAPOLI)


@pytest.fixture(scope="module")
def S(H):
    """Shared state: groups, dish, menu, order created for this module; cleaned at end."""
    st = {"groups": [], "dishes": [], "orders": [], "menu_items": []}
    yield st
    for oid in st["orders"]:
        requests.delete(f"{API}/orders/{oid}", headers=H)
    for mid, did in st["menu_items"]:
        requests.delete(f"{API}/menus/{mid}/items/{did}", headers=H)
    for did in st["dishes"]:
        requests.delete(f"{API}/dishes/{did}", headers=H)
    for gid in st["groups"]:
        requests.delete(f"{API}/option-groups/{gid}", headers=H)


def _mk_groups(H, S):
    base = requests.post(f"{API}/option-groups", headers=H, json={"name": f"TEST_Base_{SUF}", "minSelect": 1, "maxSelect": 1, "options": [
        {"name": "Insalata mista", "price": 5.5}, {"name": "Cous cous", "price": 5.5}, {"name": "Patate e carote", "price": 6.0}]})
    assert base.status_code == 200, base.text
    prot = requests.post(f"{API}/option-groups", headers=H, json={"name": f"TEST_Proteine_{SUF}", "minSelect": 0, "maxSelect": None,
                                                                 "allowRepeat": True, "options": [
        {"name": "Pollo", "price": 3.0}, {"name": "Uova", "price": 2.5, "allergens": ["uova"]}, {"name": "Salmone", "price": 4.5}]})
    assert prot.status_code == 200, prot.text
    S["groups"] += [base.json()["id"], prot.json()["id"]]
    S["base"], S["prot"] = base.json(), prot.json()


class TestOptionGroups:
    def test_create_list_update(self, H, S):
        _mk_groups(H, S)
        b = S["base"]
        assert all(isinstance(o["id"], str) and len(o["id"]) == 24 for o in b["options"])
        assert b["minSelect"] == 1 and b["maxSelect"] == 1
        lst = requests.get(f"{API}/option-groups", headers=H).json()
        assert b["id"] in [g["id"] for g in lst]
        # update: keep ids, add one option
        opts = b["options"] + [{"name": "Riso", "price": 5.0}]
        u = requests.put(f"{API}/option-groups/{b['id']}", headers=H, json={**{k: b[k] for k in ("name", "minSelect", "maxSelect", "allowRepeat")}, "options": opts})
        assert u.status_code == 200, u.text
        assert [o["id"] for o in u.json()["options"][:3]] == [o["id"] for o in b["options"]]
        assert len(u.json()["options"]) == 4
        S["base"] = u.json()

    def test_duplicate_names_400(self, H):
        r = requests.post(f"{API}/option-groups", headers=H, json={"name": "TEST_dup", "options": [{"name": "Pollo"}, {"name": " pollo "}]})
        assert r.status_code == 400 and "stesso nome" in r.json()["detail"]

    def test_max_lt_min_400(self, H):
        r = requests.post(f"{API}/option-groups", headers=H, json={"name": "TEST_mm", "minSelect": 3, "maxSelect": 2, "options": []})
        assert r.status_code == 400

    def test_invalid_group_id_put_delete(self, H):
        r = requests.delete(f"{API}/option-groups/not-an-id", headers=H)
        print("DELETE invalid id ->", r.status_code, r.text[:100])
        assert r.status_code in (400, 404, 422), f"invalid id gives {r.status_code}"

    def test_delete_unused_archives(self, H):
        g = requests.post(f"{API}/option-groups", headers=H, json={"name": f"TEST_Tmp_{SUF}", "options": [{"name": "X"}]}).json()
        d = requests.delete(f"{API}/option-groups/{g['id']}", headers=H)
        assert d.status_code == 200
        assert g["id"] not in [x["id"] for x in requests.get(f"{API}/option-groups", headers=H).json()]
        assert requests.delete(f"{API}/option-groups/{g['id']}", headers=H).status_code == 404


class TestDishes:
    def test_composable_without_groups_400(self, H):
        r = requests.post(f"{API}/dishes", headers=H, json={"name": "TEST_x", "basePrice": 0, "isComposable": True, "optionGroupIds": []})
        assert r.status_code == 400

    def test_create_composable_price_zero(self, H, S):
        r = requests.post(f"{API}/dishes", headers=H, json={"name": f"TEST_Fit_{SUF}", "basePrice": 0, "isComposable": True,
                                                           "optionGroupIds": [S["base"]["id"], S["prot"]["id"]]})
        assert r.status_code == 200, r.text
        d = r.json()
        S["dishes"].append(d["id"]); S["dish"] = d
        assert d["isComposable"] is True and d["optionGroupIds"] == [S["base"]["id"], S["prot"]["id"]] and d["basePrice"] == 0
        g = requests.get(f"{API}/dishes/{d['id']}", headers=H).json()
        assert g["optionGroupIds"] == d["optionGroupIds"]

    def test_non_composable_ignores_groups(self, H, S):
        r = requests.post(f"{API}/dishes", headers=H, json={"name": f"TEST_Normal_{SUF}", "basePrice": 8, "optionGroupIds": [S["base"]["id"]]})
        assert r.status_code == 200
        S["dishes"].append(r.json()["id"]); S["normal"] = r.json()
        assert r.json()["optionGroupIds"] == []

    def test_put_composable_toggle(self, H, S):
        did = S["normal"]["id"]
        r = requests.put(f"{API}/dishes/{did}", headers=H, json={"isComposable": True})
        assert r.status_code == 400  # no groups
        r = requests.put(f"{API}/dishes/{did}", headers=H, json={"isComposable": True, "optionGroupIds": [S["prot"]["id"]]})
        assert r.status_code == 200 and r.json()["optionGroupIds"] == [S["prot"]["id"]]
        r = requests.put(f"{API}/dishes/{did}", headers=H, json={"isComposable": False})
        assert r.status_code == 200 and r.json()["optionGroupIds"] == [] and r.json()["isComposable"] is False

    def test_delete_group_in_use_409(self, H, S):
        r = requests.delete(f"{API}/option-groups/{S['base']['id']}", headers=H)
        assert r.status_code == 409 and f"TEST_Fit_{SUF}" in r.json()["detail"]


class TestMenuAndOrders:
    def test_menu_add_and_esaurito(self, H, S):
        m = requests.get(f"{API}/menus/date/{TODAY}", headers=H)
        menu = m.json() if m.ok else requests.post(f"{API}/menus", headers=H, json={"date": TODAY}).json()
        S["menu_id"] = menu["id"]
        for did, price in ((S["dish"]["id"], 0), (S["normal"]["id"], 8)):
            r = requests.post(f"{API}/menus/{menu['id']}/items", headers=H, json={"dishId": did, "portions": 10, "dailyPrice": price})
            assert r.status_code == 200, r.text
            S["menu_items"].append((menu["id"], did))
        salmone = S["prot"]["options"][2]["id"]
        r = requests.put(f"{API}/menus/{menu['id']}/items/{S['dish']['id']}", headers=H, json={"unavailableOptionIds": [salmone, salmone]})
        assert r.status_code == 200
        it = next(i for i in r.json()["items"] if i["dishId"] == S["dish"]["id"])
        assert it["unavailableOptionIds"] == [salmone]

    def test_order_validation_rules(self, H, S):
        o = requests.post(f"{API}/orders?menu_date={TODAY}", headers=H, json={"channel": "persona", "customerName": f"TEST_Comp_{SUF}"})
        assert o.status_code == 200, o.text
        S["order"] = o.json()["id"]; S["orders"].append(S["order"])
        b, p = S["base"]["options"], S["prot"]["options"]
        cases = [
            ([{"optionId": p[0]["id"]}], "Scegli"),
            ([{"optionId": b[0]["id"]}, {"optionId": b[1]["id"]}], "massimo 1"),
            ([{"optionId": b[0]["id"], "quantity": 2}], None),
            ([{"optionId": b[0]["id"]}, {"optionId": p[2]["id"]}], "esaurito"),
            ([{"optionId": b[0]["id"]}, {"optionId": "garbage"}], "non valido"),
            ([], "Scegli"),
        ]
        for sel, msg in cases:
            r = requests.post(f"{API}/orders/{S['order']}/items", headers=H, json={"dishId": S["dish"]["id"], "quantity": 1, "selections": sel})
            assert r.status_code == 400, (sel, r.status_code, r.text)
            if msg:
                assert msg in r.json()["detail"], r.json()["detail"]

    def test_option_from_other_dish_400(self, H, S):
        r = requests.post(f"{API}/orders/{S['order']}/items", headers=H, json={"dishId": S["normal"]["id"], "quantity": 1,
                                                                               "selections": [{"optionId": S["base"]["options"][0]["id"]}]})
        assert r.status_code == 400 and "non è componibile" in r.json()["detail"]

    def test_add_composed_and_price(self, H, S):
        b, p = S["base"]["options"], S["prot"]["options"]
        r = requests.post(f"{API}/orders/{S['order']}/items", headers=H, json={"dishId": S["dish"]["id"], "quantity": 2, "selections": [
            {"optionId": b[0]["id"]}, {"optionId": p[0]["id"], "quantity": 2}, {"optionId": p[1]["id"]}]})
        assert r.status_code == 200, r.text
        it = r.json()["items"][-1]
        assert it["unitPrice"] == 14.0 and it["subtotal"] == 28.0
        assert [(c["name"], c["quantity"], c["groupName"]) for c in it["composition"]] == [
            ("Insalata mista", 1, f"TEST_Base_{SUF}"), ("Pollo", 2, f"TEST_Proteine_{SUF}"), ("Uova", 1, f"TEST_Proteine_{SUF}")]
        assert set(it["composition"][0]) == {"groupId", "groupName", "optionId", "name", "price", "quantity"}
        m = requests.get(f"{API}/menus/date/{TODAY}", headers=H).json()
        assert next(i for i in m["items"] if i["dishId"] == S["dish"]["id"])["portions"] == 8
        S["idx"] = len(r.json()["items"]) - 1
        # customPrice overrides
        r2 = requests.post(f"{API}/orders/{S['order']}/items", headers=H, json={"dishId": S["dish"]["id"], "quantity": 1, "customPrice": 9.9,
                                                                                "selections": [{"optionId": b[1]["id"]}]})
        assert r2.status_code == 200 and r2.json()["items"][-1]["unitPrice"] == 9.9
        assert r2.json()["total"] == pytest.approx(37.9)

    def test_patch_recompute(self, H, S):
        b, p = S["base"]["options"], S["prot"]["options"]
        r = requests.patch(f"{API}/orders/{S['order']}/items/by-index/{S['idx']}", headers=H, json={"selections": [{"optionId": b[2]["id"]}, {"optionId": p[1]["id"]}]})
        assert r.status_code == 200, r.text
        it = r.json()["items"][S["idx"]]
        assert it["unitPrice"] == 8.5 and it["subtotal"] == 17.0
        assert r.json()["total"] == pytest.approx(26.9)
        # mark Uova esaurito -> kept option still allowed on PATCH, but new add rejected
        requests.put(f"{API}/menus/{S['menu_id']}/items/{S['dish']['id']}", headers=H, json={"unavailableOptionIds": [p[1]["id"], p[2]["id"]]})
        r = requests.patch(f"{API}/orders/{S['order']}/items/by-index/{S['idx']}", headers=H, json={"selections": [{"optionId": b[0]["id"]}, {"optionId": p[1]["id"]}, {"optionId": p[0]["id"]}]})
        assert r.status_code == 200, r.text
        assert r.json()["items"][S["idx"]]["unitPrice"] == 11.0
        r = requests.post(f"{API}/orders/{S['order']}/items", headers=H, json={"dishId": S["dish"]["id"], "quantity": 1,
                                                                               "selections": [{"optionId": b[0]["id"]}, {"optionId": p[1]["id"]}]})
        assert r.status_code == 400 and "esaurito" in r.json()["detail"]
        # patch on non-composable item
        rn = requests.post(f"{API}/orders/{S['order']}/items", headers=H, json={"dishId": S["normal"]["id"], "quantity": 1})
        assert rn.status_code == 200 and rn.json()["items"][-1]["unitPrice"] == 8
        nidx = len(rn.json()["items"]) - 1
        r = requests.patch(f"{API}/orders/{S['order']}/items/by-index/{nidx}", headers=H, json={"selections": [{"optionId": b[0]["id"]}]})
        assert r.status_code == 400

    def test_kitchen_porzionatura_composition(self, H, S):
        pz = requests.get(f"{API}/porzionatura?menu_date={TODAY}", headers=H).json()
        groups = pz if isinstance(pz, list) else pz.get("groups", [])
        e = [e for g in groups for e in g["entries"] if e["orderId"] == S["order"] and e["itemIndex"] == S["idx"]]
        assert e and len(e[0]["composition"]) == 3
        r = requests.patch(f"{API}/orders/{S['order']}/items/by-index/{S['idx']}", headers=H, json={"sendToKitchen": True})
        assert r.status_code == 200
        k = requests.get(f"{API}/kitchen?menu_date={TODAY}", headers=H).json()
        e = [e for g in k for e in g["entries"] if e["orderId"] == S["order"] and e["itemIndex"] == S["idx"]]
        assert e and [c["name"] for c in e[0]["composition"]] == ["Insalata mista", "Uova", "Pollo"] or [c["name"] for c in e[0]["composition"]] == ["Insalata mista", "Pollo", "Uova"]

    def test_regression_custom_item(self, H, S):
        r = requests.post(f"{API}/orders/{S['order']}/items", headers=H, json={"dishName": "TEST_libero", "quantity": 1, "customPrice": 4})
        assert r.status_code == 200 and r.json()["items"][-1]["isCustomItem"] is True


class TestCrossTenant:
    def test_tenant_b_isolation(self, H, S):
        sa = _h(ADMIN)
        email, pwd = f"test_comp_{SUF}@example.com", "TestPass123!"
        reg = requests.post(f"{API}/auth/register", json={"email": email, "password": pwd, "name": "TEST Owner",
                                                          "tenant_name": f"TEST_Comp {SUF}", "tenant_slug": f"test-comp-{SUF}", "privacy_accepted": True})
        assert reg.status_code == 201, reg.text
        pend = requests.get(f"{API}/superadmin/tenants?status=in_attesa", headers=sa).json()
        tid = next(t["id"] for t in pend["tenants"] if t.get("owner_email") == email)
        requests.patch(f"{API}/superadmin/tenants/{tid}/status", json={"status": "attivo"}, headers=sa)
        try:
            HB = _h({"email": email, "password": pwd})
            gid = S["prot"]["id"]
            assert gid not in [g["id"] for g in requests.get(f"{API}/option-groups", headers=HB).json()]
            assert requests.put(f"{API}/option-groups/{gid}", headers=HB, json={"name": "hack", "options": []}).status_code == 404
            assert requests.delete(f"{API}/option-groups/{gid}", headers=HB).status_code == 404
            r = requests.post(f"{API}/dishes", headers=HB, json={"name": "TEST_B", "basePrice": 1, "isComposable": True, "optionGroupIds": [gid]})
            assert r.status_code == 400 and r.json()["detail"] == "Lista di scelta non trovata"
            # A's group still intact
            assert any(g["id"] == gid and g["name"].startswith("TEST_Proteine") for g in requests.get(f"{API}/option-groups", headers=H).json())
        finally:
            requests.patch(f"{API}/superadmin/tenants/{tid}/status", json={"status": "sospeso"}, headers=sa)
