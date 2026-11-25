"""Verifica rapida API piatti componibili (preview, locale Pizzeria Napoli)."""
import os
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

B = (sys.argv[1] if len(sys.argv) > 1 else os.environ["API"]).rstrip("/") + "/api"
tok = requests.post(f"{B}/auth/login", json={"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}).json()["access_token"]
H = {"Authorization": f"Bearer {tok}"}
today = datetime.now(ZoneInfo("Europe/Rome")).strftime("%Y-%m-%d")


def ok(r, label):
    print(("OK  " if r.ok else "ERR ") + label, r.status_code, "" if r.ok else r.text[:200])
    return r.json() if r.ok else None


base = ok(requests.post(f"{B}/option-groups", headers=H, json={"name": "TEST_Base", "minSelect": 1, "maxSelect": 1, "options": [
    {"name": "Insalata mista", "price": 5.5}, {"name": "Cous cous", "price": 5.5}, {"name": "Patate e carote", "price": 6.0}]}), "crea gruppo Base")
prot = ok(requests.post(f"{B}/option-groups", headers=H, json={"name": "TEST_Proteine", "minSelect": 0, "maxSelect": None, "allowRepeat": True, "options": [
    {"name": "Pollo", "price": 3.0, "allergens": []}, {"name": "Uova", "price": 2.5, "allergens": ["uova"]}, {"name": "Salmone", "price": 4.5, "allergens": ["pesce"]}]}), "crea gruppo Proteine")
r = requests.post(f"{B}/dishes", headers=H, json={"name": "TEST_Piatto Fit", "basePrice": 0, "isComposable": True, "optionGroupIds": []})
print("componibile senza gruppi ->", r.status_code, r.json().get("detail"))
dish = ok(requests.post(f"{B}/dishes", headers=H, json={"name": "TEST_Piatto Fit", "basePrice": 0, "isComposable": True, "optionGroupIds": [base["id"], prot["id"]]}), "crea piatto componibile")
menu = requests.get(f"{B}/menus/date/{today}", headers=H)
menu = menu.json() if menu.ok else ok(requests.post(f"{B}/menus", headers=H, json={"date": today}), "crea menu oggi")
menu = ok(requests.post(f"{B}/menus/{menu['id']}/items", headers=H, json={"dishId": dish["id"], "portions": 20, "dailyPrice": 0}), "aggiungi al menu")
salmone = prot["options"][2]["id"]
ok(requests.put(f"{B}/menus/{menu['id']}/items/{dish['id']}", headers=H, json={"unavailableOptionIds": [salmone]}), "salmone esaurito oggi")
order = ok(requests.post(f"{B}/orders?menu_date={today}", headers=H, json={"channel": "persona", "customerName": "TEST_Composizione"}), "crea ordine")
ins, pollo, uova = base["options"][0]["id"], prot["options"][0]["id"], prot["options"][1]["id"]
for label, sel in [("senza base", [{"optionId": pollo}]), ("due basi", [{"optionId": ins}, {"optionId": base["options"][1]["id"]}]),
                   ("salmone esaurito", [{"optionId": ins}, {"optionId": salmone}]), ("opzione estranea", [{"optionId": ins}, {"optionId": "x"}])]:
    r = requests.post(f"{B}/orders/{order['id']}/items", headers=H, json={"dishId": dish["id"], "quantity": 1, "selections": sel})
    print(f"rifiuto {label} ->", r.status_code, r.json().get("detail"))
o = ok(requests.post(f"{B}/orders/{order['id']}/items", headers=H, json={"dishId": dish["id"], "quantity": 2, "notes": "senza limone",
                                                                      "selections": [{"optionId": ins}, {"optionId": pollo, "quantity": 2}, {"optionId": uova}]}), "aggiungi Fit")
it = o["items"][-1]
print("   prezzo unitario", it["unitPrice"], "(atteso 14.0) subtotale", it["subtotal"], "totale", o["total"])
print("   composizione", [(c["name"], c["quantity"]) for c in it["composition"]])
idx = len(o["items"]) - 1
o = ok(requests.patch(f"{B}/orders/{order['id']}/items/by-index/{idx}", headers=H, json={"selections": [{"optionId": base["options"][2]["id"]}, {"optionId": uova}]}), "modifica composizione")
it = o["items"][idx]
print("   nuovo prezzo", it["unitPrice"], "(atteso 8.5) subtotale", it["subtotal"], [(c["name"], c["quantity"]) for c in it["composition"]])
ok(requests.patch(f"{B}/orders/{order['id']}/items/by-index/{idx}", headers=H, json={"sendToKitchen": True}), "manda in cucina")
k = ok(requests.get(f"{B}/kitchen?menu_date={today}", headers=H), "cucina")
print("   cucina:", [(g["dishName"], [e["composition"] for e in g["entries"]]) for g in k if g["dishName"].startswith("TEST_")])
m = requests.get(f"{B}/menus/date/{today}", headers=H).json()
print("   porzioni rimaste", next(i["portions"] for i in m["items"] if i["dishId"] == dish["id"]), "(attese 18)")
print("   gruppi:", [g["name"] for g in ok(requests.get(f"{B}/option-groups", headers=H), "lista gruppi")])
r = requests.delete(f"{B}/option-groups/{base['id']}", headers=H)
print("elimina gruppo in uso ->", r.status_code, r.json().get("detail"))
print("IDS", order["id"], dish["id"], base["id"], prot["id"], menu["id"])
