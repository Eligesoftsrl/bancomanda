import requests, json, datetime
B = "https://bistrot-hub--1m3cnv6f.preview.emergentagent.com/api"
t = requests.post(f"{B}/auth/login", json={"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}).json()["access_token"]
H = {"Authorization": f"Bearer {t}"}
dishes = [d for d in requests.get(f"{B}/dishes", headers=H).json() if d["name"].startswith("TEST_Piatto_Lungo")]
custs = [c for c in requests.get(f"{B}/customers", headers=H).json() if c["name"] == "TEST_Cliente_Modali"]
cid = custs[0]["id"]
today = datetime.date.today().isoformat()
menu = requests.get(f"{B}/menus/date/{today}", headers=H).json()
print("menu", menu["id"], menu.get("createdAt"), len(menu["items"]))
created = {"dishes": [d["id"] for d in dishes], "customers": [cid], "orders": [], "menu": menu["id"]}
for k in range(2):
    r = requests.post(f"{B}/orders?menu_date={today}", headers=H, json={"channel": "telefono", "customerId": cid, "customerName": "TEST_Cliente_Modali", "notes": "TEST"})
    print("order", r.status_code, r.text[:200]); oid = r.json()["id"]; created["orders"].append(oid)
    for d in created["dishes"][:5]:
        rr = requests.post(f"{B}/orders/{oid}/items", headers=H, json={"dishId": d, "quantity": 2})
        print(" item", rr.status_code, rr.text[:100] if rr.status_code != 200 else "")
json.dump(created, open("/tmp/created.json", "w"))
print(created)
