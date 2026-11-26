# Setup TEST_ data for iteration 24: today's menu items + 5 orders, one per status
import os, sys, json, requests
B = os.environ.get("BASE") or open('/app/frontend/.env').read().split("EXPO_PUBLIC_BACKEND_URL=")[1].split()[0]
mode = sys.argv[1] if len(sys.argv) > 1 else "setup"
r = requests.post(f"{B}/api/auth/login", json={"email": "titolare@pizzeria-napoli.it", "password": "Password123!"})
T = r.json()["access_token"]; open('/tmp/tok', 'w').write(T)
H = {"Authorization": f"Bearer {T}"}
D = "2026-11-26"
if mode == "cleanup":
    st = json.load(open('/tmp/iter24.json'))
    for oid in st["orders"]:
        print("del order", oid, requests.delete(f"{B}/api/orders/{oid}", headers=H).status_code)
    for did in st["added_items"]:
        print("del menu item", did, requests.delete(f"{B}/api/menus/{st['menu_id']}/items/{did}", headers=H).status_code)
    sys.exit()
m = requests.get(f"{B}/api/menus/date/{D}", headers=H)
if m.status_code != 200:
    m = requests.post(f"{B}/api/menus", headers=H, json={"date": D})
menu = m.json(); print("menu", m.status_code, menu.get("id"), len(menu.get('items', [])))
have = {i['dishId'] for i in menu.get('items', [])}
added = []
for did, price in [("6b06cad068c56da4b3e915bc", 9.5)]:
    if did not in have:
        r = requests.post(f"{B}/api/menus/{menu['id']}/items", headers=H, json={"dishId": did, "portions": 30, "dailyPrice": price})
        print("add menu item", r.status_code); added.append(did)
specs = [
    ("in_attesa", "TEST_Attesa Rossi", "persona", "da_consegnare", "13:30", "TEST nota ordine: citofono rotto, chiamare al cellulare"),
    ("in_preparazione", "TEST_Prep Bianchi", "telefono", "da_ritirare", "", ""),
    ("pronto", "TEST_Pronto Verdi", "whatsapp", "in_sede", "", ""),
    ("sospeso", "TEST_Sospeso Neri", "persona", "in_sede", "", ""),
    ("consegnato", "TEST_Consegnato Gialli", "persona", "in_sede", "", ""),
]
ids = []
for status, name, ch, svc, dt, notes in specs:
    o = requests.post(f"{B}/api/orders", params={"menu_date": D}, headers=H,
                      json={"channel": ch, "serviceType": svc, "customerName": name, "deliveryTime": dt, "notes": notes}).json()
    ids.append(o["id"])
    requests.post(f"{B}/api/orders/{o['id']}/items", headers=H, json={"dishId": "6b06cad068c56da4b3e915bc", "quantity": 1})
    if status != "in_attesa":
        print(status, requests.put(f"{B}/api/orders/{o['id']}/status", headers=H, json={"status": status}).status_code)
json.dump({"menu_id": menu['id'], "orders": ids, "added_items": added}, open('/tmp/iter24.json', 'w'))
print(ids)
