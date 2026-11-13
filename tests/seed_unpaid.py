import requests, json, base64, io
from PIL import Image
B = "https://bistrot-hub--1m3cnv6f.preview.emergentagent.com/api"
t = requests.post(f"{B}/auth/login", json={"email": "titolare@pizzeria-napoli.it", "password": "Password123!"}).json()["access_token"]
H = {"Authorization": f"Bearer {t}"}
c = json.load(open("/tmp/created.json"))
for o in c["orders"][2:5]:
    print(requests.put(f"{B}/orders/{o}/payment", headers=H, json={"isPaid": False}).status_code)
img = Image.new("RGB", (600, 2400), (240, 200, 120)); buf = io.BytesIO(); img.save(buf, "JPEG", quality=30)
b64 = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
print(requests.put(f"{B}/orders/{c['orders'][2]}/receipt", headers=H, json={"receiptImage": b64}).status_code)
