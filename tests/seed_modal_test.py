import requests, json, datetime
B = "https://bistrot-hub--1m3cnv6f.preview.emergentagent.com/api"
t = requests.post(f"{B}/auth/login", json={"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}).json()["access_token"]
H = {"Authorization": f"Bearer {t}"}
created = {"dishes": [], "customers": [], "orders": [], "menu": None}
dishes = requests.get(f"{B}/dishes", headers=H).json()
print("existing dishes", len(dishes))
cats = requests.get(f"{B}/categories", headers=H).json()
print("cats", len(cats))
cat_id = cats[0]["id"] if cats else None
long_desc = "TEST descrizione molto lunga. " * 30
for i in range(6):
    r = requests.post(f"{B}/dishes", headers=H, json={"name": f"TEST_Piatto_Lungo_{i}", "description": long_desc, "basePrice": 9.5 + i,
        "categoryId": cat_id, "tags": ["senza_glutine", "vegetariano", "piccante", "vegano"],
        "allergens": ["glutine", "latte", "uova", "pesce", "arachidi", "soia", "frutta_a_guscio", "sedano", "senape", "sesamo"]})
    print("dish", r.status_code); created["dishes"].append(r.json()["id"])
r = requests.post(f"{B}/customers", headers=H, json={"name": "TEST_Cliente_Modali", "phone": "3331112222", "email": "t@t.it", "address": "Via Test 1", "notes": "note " * 40})
print("cust", r.status_code); cid = r.json()["id"]; created["customers"].append(cid)
today = datetime.date.today().isoformat()
m = requests.get(f"{B}/menus/date/{today}", headers=H)
if m.status_code == 404:
    m = requests.post(f"{B}/menus", headers=H, json={"date": today}); created["menu"] = m.json().get("id")
print("menu", m.status_code)
mid = m.json()["id"]
for d in created["dishes"]:
    r = requests.post(f"{B}/menus/{mid}/items", headers=H, json={"dishId": d, "portions": 10, "dailyPrice": 10})
    print("menuitem", r.status_code, r.text[:100] if r.status_code != 200 else "")
for k in range(2):
    r = requests.post(f"{B}/orders", headers=H, json={"channel": "telefono", "customerId": cid, "customerName": "TEST_Cliente_Modali", "notes": "TEST"})
    print("order", r.status_code, r.text[:200]); oid = r.json()["id"]; created["orders"].append(oid)
    for d in created["dishes"][:5]:
        rr = requests.post(f"{B}/orders/{oid}/items", headers=H, json={"dishId": d, "quantity": 2})
        print(" item", rr.status_code, rr.text[:100] if rr.status_code != 200 else "")
json.dump(created, open("/tmp/created.json", "w"))
print(created)
