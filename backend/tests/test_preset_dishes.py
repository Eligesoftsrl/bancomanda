# Piatti già composti (ricetta di partenza su un piatto componibile): scheda piatto, ordine
# con ingredienti tolti/aggiunti, prezzo, cucina. Scrive SOLO su Pizzeria Napoli.
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest
import requests

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env", override=False)
sys.path.insert(0, str(ROOT))
from composable import preset_changes, preset_summary  # noqa: E402

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", os.environ.get("REACT_APP_BACKEND_URL")).rstrip("/")
API = f"{BASE_URL}/api"
NAPOLI = {"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}
TODAY = datetime.now(ZoneInfo("Europe/Rome")).strftime("%Y-%m-%d")
SUF = uuid.uuid4().hex[:6]


@pytest.fixture(scope="module")
def H():
    r = requests.post(f"{API}/auth/login", json=NAPOLI, timeout=20)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def S(H):
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


def _opt(group, name):
    return next(o["id"] for o in group["options"] if o["name"] == name)


def test_unit_helpers():
    groups = [{"_id": "g", "name": "F", "options": [
        {"id": "a", "name": "Hamburger", "price": 3.0, "allergens": []},
        {"id": "b", "name": "Cheddar", "price": 1.0, "allergens": ["latte"]},
        {"id": "c", "name": "Bacon", "price": 1.5, "allergens": []}]}]
    preset = [{"optionId": "a", "quantity": 1}, {"optionId": "b", "quantity": 1}]
    assert preset_summary(groups, preset) == (["Hamburger", "Cheddar"], 4.0, ["latte"])
    comp = [{"optionId": "a", "quantity": 2}, {"optionId": "c", "quantity": 1}]
    assert preset_changes(groups, preset, comp) == {"removed": ["Cheddar"], "added": ["Hamburger", "Bacon"]}
    assert preset_changes(groups, [], comp) is None


class TestPresetFlow:
    def test_setup(self, H, S):
        pane = requests.post(f"{API}/option-groups", headers=H, json={"name": f"TEST_Pane_{SUF}", "minSelect": 1, "maxSelect": 1, "options": [
            {"name": "Sesamo", "price": 1.0}, {"name": "Integrale", "price": 1.5}]})
        farc = requests.post(f"{API}/option-groups", headers=H, json={"name": f"TEST_Farciture_{SUF}", "minSelect": 0, "maxSelect": None,
                                                                     "allowRepeat": True, "options": [
            {"name": "Hamburger", "price": 3.0}, {"name": "Cheddar", "price": 1.0, "allergens": ["latte"]}, {"name": "Bacon", "price": 1.5}]})
        assert pane.status_code == 200 and farc.status_code == 200, (pane.text, farc.text)
        S["pane"], S["farc"] = pane.json(), farc.json()
        S["groups"] += [S["pane"]["id"], S["farc"]["id"]]

    def test_invalid_recipe_rejected(self, H, S):
        bad = [{"optionId": _opt(S["pane"], "Sesamo")}, {"optionId": _opt(S["pane"], "Integrale")}]
        r = requests.post(f"{API}/dishes", headers=H, json={"name": f"TEST_Bad_{SUF}", "basePrice": 3, "isComposable": True,
                                                         "optionGroupIds": S["groups"], "presetSelections": bad})
        assert r.status_code == 400 and "massimo 1" in r.json()["detail"], r.text
        r = requests.post(f"{API}/dishes", headers=H, json={"name": f"TEST_Bad2_{SUF}", "basePrice": 3, "isComposable": True,
                                                         "optionGroupIds": S["groups"], "presetSelections": [{"optionId": _opt(S["farc"], "Bacon")}]})
        assert r.status_code == 400 and "Scegli" in r.json()["detail"], r.text

    def test_create_preset_dish(self, H, S):
        recipe = [{"optionId": _opt(S["pane"], "Sesamo"), "quantity": 1}, {"optionId": _opt(S["farc"], "Hamburger"), "quantity": 1},
                  {"optionId": _opt(S["farc"], "Cheddar"), "quantity": 1}]
        r = requests.post(f"{API}/dishes", headers=H, json={"name": f"TEST_Panino_{SUF}", "basePrice": 3, "isComposable": True,
                                                         "optionGroupIds": S["groups"], "presetSelections": recipe})
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["presetSelections"]) == 3
        S["dish"] = d
        S["dishes"].append(d["id"])
        got = requests.get(f"{API}/dishes/{d['id']}", headers=H).json()
        assert {p["optionId"] for p in got["presetSelections"]} == {p["optionId"] for p in recipe}

    def test_menu_and_order(self, H, S):
        m = requests.get(f"{API}/menus/date/{TODAY}", headers=H)
        if m.status_code == 404:
            m = requests.post(f"{API}/menus", headers=H, json={"date": TODAY})
        assert m.status_code == 200, m.text
        mid = m.json()["id"]
        r = requests.post(f"{API}/menus/{mid}/items", headers=H, json={"dishId": S["dish"]["id"], "portions": 10, "dailyPrice": 3})
        assert r.status_code == 200, r.text
        S["menu_items"].append((mid, S["dish"]["id"]))
        o = requests.post(f"{API}/orders", headers=H, params={"menu_date": TODAY}, json={"channel": "persona", "customerName": "TEST_preset"})
        assert o.status_code == 200, o.text
        oid = o.json()["id"]
        S["orders"].append(oid)
        S["order"] = oid

        # 1) Senza selections: parte dalla ricetta → 3 + 1 + 3 + 1 = 8
        r = requests.post(f"{API}/orders/{oid}/items", headers=H, json={"dishId": S["dish"]["id"], "quantity": 1})
        assert r.status_code == 200, r.text
        it = r.json()["items"][-1]
        assert it["unitPrice"] == 8.0 and it["presetChanges"] == {"removed": [], "added": []}

        # 2) Senza Cheddar, + Bacon → 8 - 1 + 1.5 = 8.5
        sel = [{"optionId": _opt(S["pane"], "Sesamo"), "quantity": 1}, {"optionId": _opt(S["farc"], "Hamburger"), "quantity": 1},
               {"optionId": _opt(S["farc"], "Bacon"), "quantity": 1}]
        r = requests.post(f"{API}/orders/{oid}/items", headers=H, json={"dishId": S["dish"]["id"], "quantity": 1, "selections": sel, "notes": ""})
        assert r.status_code == 200, r.text
        it = r.json()["items"][-1]
        assert it["unitPrice"] == 8.5
        assert it["presetChanges"] == {"removed": ["Cheddar"], "added": ["Bacon"]}

    def test_patch_recomputes_changes(self, H, S):
        sel = [{"optionId": _opt(S["pane"], "Integrale"), "quantity": 1}, {"optionId": _opt(S["farc"], "Hamburger"), "quantity": 1},
               {"optionId": _opt(S["farc"], "Cheddar"), "quantity": 1}]
        r = requests.patch(f"{API}/orders/{S['order']}/items/by-index/0", headers=H, json={"selections": sel})
        assert r.status_code == 200, r.text
        it = r.json()["items"][0]
        assert it["unitPrice"] == 8.5
        assert it["presetChanges"] == {"removed": ["Sesamo"], "added": ["Integrale"]}

    def test_kitchen_exposes_changes(self, H, S):
        r = requests.patch(f"{API}/orders/{S['order']}/items/by-index/1", headers=H, json={"sendToKitchen": True})
        assert r.status_code == 200, r.text
        k = requests.get(f"{API}/kitchen", headers=H, params={"menu_date": TODAY})
        assert k.status_code == 200, k.text
        entries = [e for g in k.json() for e in g["entries"] if e["orderId"] == S["order"]]
        assert entries and entries[0]["presetChanges"] == {"removed": ["Cheddar"], "added": ["Bacon"]}

    def test_portions_with_repeated_dish_lines(self, H, S):
        def portions():
            m = requests.get(f"{API}/menus/date/{TODAY}", headers=H).json()
            return next(i["portions"] for i in m["items"] if i["dishId"] == S["dish"]["id"])
        assert portions() == 8  # 10 - 2 righe dello stesso piatto
        r = requests.put(f"{API}/orders/{S['order']}/status", headers=H, json={"status": "sospeso"})
        assert r.status_code == 200 and portions() == 10, r.text
        r = requests.put(f"{API}/orders/{S['order']}/status", headers=H, json={"status": "in_attesa"})
        assert r.status_code == 200 and portions() == 8, r.text
        r = requests.delete(f"{API}/orders/{S['order']}", headers=H)
        assert r.status_code == 200 and portions() == 10, r.text

    def test_turn_off_recipe(self, H, S):
        r = requests.put(f"{API}/dishes/{S['dish']['id']}", headers=H, json={"presetSelections": []})
        assert r.status_code == 200 and r.json()["presetSelections"] == [], r.text
        r = requests.put(f"{API}/dishes/{S['dish']['id']}", headers=H, json={"isComposable": False})
        assert r.status_code == 200 and r.json()["presetSelections"] == [] and r.json()["optionGroupIds"] == [], r.text
