import requests, json
B = "https://bistrot-hub--1m3cnv6f.preview.emergentagent.com/api"
t = requests.post(f"{B}/auth/login", json={"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}).json()["access_token"]
H = {"Authorization": f"Bearer {t}"}
c = json.load(open("/tmp/created.json"))
print(requests.put(f"{B}/menus/{c['menu']}/items/{c['dishes'][-1]}", headers=H, json={"portions": 0}).status_code)
d = requests.post(f"{B}/dishes", headers=H, json={"name": "TEST_NotInMenu", "basePrice": 7, "description": "TEST lunga " * 50}).json()["id"]
c["dishes"].append(d); json.dump(c, open("/tmp/created.json", "w")); print(d)
