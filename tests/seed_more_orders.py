import requests, json, datetime
B = "https://bistrot-hub--1m3cnv6f.preview.emergentagent.com/api"
t = requests.post(f"{B}/auth/login", json={"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}).json()["access_token"]
H = {"Authorization": f"Bearer {t}"}
c = json.load(open("/tmp/created.json"))
today = datetime.date.today().isoformat()
for k in range(4):
    r = requests.post(f"{B}/orders?menu_date={today}", headers=H, json={"channel": "whatsapp", "customerId": c["customers"][0], "customerName": "TEST_Cliente_Modali", "notes": "TEST nota lunga " * 10})
    oid = r.json()["id"]; c["orders"].append(oid)
    for d in c["dishes"]:
        requests.post(f"{B}/orders/{oid}/items", headers=H, json={"dishId": d, "quantity": 1})
json.dump(c, open("/tmp/created.json", "w")); print(c["orders"])
