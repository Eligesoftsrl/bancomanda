import requests, json, datetime
B = "https://bistrot-hub--1m3cnv6f.preview.emergentagent.com/api"
t = requests.post(f"{B}/auth/login", json={"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}).json()["access_token"]
H = {"Authorization": f"Bearer {t}"}
c = json.load(open("/tmp/created.json"))
today = datetime.date.today().isoformat()
orders = requests.get(f"{B}/orders", headers=H, params={"menu_date": today}).json()
extra = [o["id"] for o in orders if o.get("orderNumber") == 7 and not o.get("customerName") or (o.get("orderNumber")==7 and o.get("customerName") in (None,"","Anonimo"))]
print("ui order to delete", extra)
for o in c["orders"] + extra:
    print("del order", requests.delete(f"{B}/orders/{o}", headers=H).status_code, end="; ")
dishes = requests.get(f"{B}/dishes", headers=H).json()
ipad = [d["id"] for d in dishes if d["name"] == "TEST_iPad_Dish"]
for d in c["dishes"] + ipad:
    requests.delete(f"{B}/menus/{c['menu']}/items/{d}", headers=H)
    print("del dish", requests.delete(f"{B}/dishes/{d}", headers=H).status_code, end="; ")
print()
print("remaining orders today", len(requests.get(f"{B}/orders", headers=H, params={"menu_date": today}).json()))
print("remaining TEST dishes", [d["name"] for d in requests.get(f"{B}/dishes", headers=H).json() if d["name"].startswith("TEST_")])
print("menu items", len(requests.get(f"{B}/menus/{c['menu']}", headers=H).json()["items"]))
