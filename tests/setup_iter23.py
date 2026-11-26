# Setup TEST_ data for iteration 23: today's menu + order with items
import os, requests, json
B = "https://bistrot-hub--1m3cnv6f.preview.emergentagent.com"
T = open('/tmp/tok').read().strip()
H = {"Authorization": f"Bearer {T}"}
D = "2026-11-26"
m = requests.get(f"{B}/api/menus/date/{D}", headers=H)
if m.status_code != 200:
    m = requests.post(f"{B}/api/menus", headers=H, json={"date": D})
menu = m.json(); print("menu", m.status_code, menu.get("id"))
have = {i['dishId'] for i in menu.get('items', [])}
for did, price in [("6b06cad068c56da4b3e915bc", 9.5), ("6b06c4a00018e615ca3a017c", 0.0)]:
    if did not in have:
        r = requests.post(f"{B}/api/menus/{menu['id']}/items", headers=H, json={"dishId": did, "portions": 30, "dailyPrice": price})
        print("add menu item", r.status_code, r.text[:200])
o = requests.post(f"{B}/api/orders", params={"menu_date": D}, headers=H, json={"channel": "persona", "serviceType": "in_sede", "customerName": "TEST_Oggi Riepilogo"})
order = o.json(); print("order", o.status_code, order.get("id"))
r = requests.post(f"{B}/api/orders/{order['id']}/items", headers=H, json={"dishId": "6b06cad068c56da4b3e915bc", "quantity": 2, "notes": "TEST nota lunga per verificare che il testo vada a capo senza sovrapporsi ai pulsanti"})
print("item1", r.status_code, r.text[:200])
r = requests.post(f"{B}/api/orders/{order['id']}/items", headers=H, json={"dishName": "TEST_Libero con un nome piuttosto lungo", "customPrice": 5.0, "quantity": 1})
print("item2", r.status_code, r.text[:200])
json.dump({"menu_id": menu['id'], "order_id": order['id']}, open('/tmp/iter23.json', 'w'))
