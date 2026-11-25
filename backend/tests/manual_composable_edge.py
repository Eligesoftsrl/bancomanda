# Edge: composable dish deactivated -> its only group archived -> dish reactivated -> order sold at 0 €?
import os
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

API = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") + "/api"
H = {"Authorization": "Bearer " + requests.post(f"{API}/auth/login", json={"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}).json()["access_token"]}
TODAY = datetime.now(ZoneInfo("Europe/Rome")).strftime("%Y-%m-%d")
s = uuid.uuid4().hex[:5]
g = requests.post(f"{API}/option-groups", headers=H, json={"name": f"TEST_E_{s}", "minSelect": 1, "maxSelect": 1, "options": [{"name": "A", "price": 5}]}).json()
d = requests.post(f"{API}/dishes", headers=H, json={"name": f"TEST_E_{s}", "basePrice": 0, "isComposable": True, "optionGroupIds": [g["id"]]}).json()
menu = requests.get(f"{API}/menus/date/{TODAY}", headers=H).json()
requests.post(f"{API}/menus/{menu['id']}/items", headers=H, json={"dishId": d["id"], "portions": 3, "dailyPrice": 0})
print("deactivate:", requests.delete(f"{API}/dishes/{d['id']}", headers=H).status_code)
print("archive group:", requests.delete(f"{API}/option-groups/{g['id']}", headers=H).status_code)
r = requests.put(f"{API}/dishes/{d['id']}", headers=H, json={"active": True})
print("reactivate:", r.status_code, r.json().get("isComposable"), r.json().get("optionGroupIds"))
o = requests.post(f"{API}/orders?menu_date={TODAY}", headers=H, json={"channel": "persona", "customerName": f"TEST_E_{s}"}).json()
r = requests.post(f"{API}/orders/{o['id']}/items", headers=H, json={"dishId": d["id"], "quantity": 1})
print("order add no selections:", r.status_code, r.json()["items"][-1]["unitPrice"] if r.ok else r.text)
# cleanup
print("cleanup:", requests.delete(f"{API}/orders/{o['id']}", headers=H).status_code,
      requests.delete(f"{API}/menus/{menu['id']}/items/{d['id']}", headers=H).status_code,
      requests.delete(f"{API}/dishes/{d['id']}", headers=H).status_code)
