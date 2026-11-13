import requests, json
B = "https://bistrot-hub--1m3cnv6f.preview.emergentagent.com/api"
t = requests.post(f"{B}/auth/login", json={"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}).json()["access_token"]
H = {"Authorization": f"Bearer {t}"}
c = json.load(open("/tmp/created.json"))
for i in range(10):
    d = requests.post(f"{B}/dishes", headers=H, json={"name": f"TEST_Extra_{i}", "basePrice": 5+i}).json()["id"]
    c["dishes"].append(d)
    print(requests.post(f"{B}/menus/{c['menu']}/items", headers=H, json={"dishId": d, "portions": 5, "dailyPrice": 6}).status_code, end=" ")
json.dump(c, open("/tmp/created.json", "w"))
