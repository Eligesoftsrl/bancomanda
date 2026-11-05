"""Dati DEMO per gli screenshot della landing. Usa SOLO il backend temporaneo su porta 8002
(DB bancomanda_demo_screens). Non va mai puntato al database reale."""
import requests, datetime
from pymongo import MongoClient

B = "http://127.0.0.1:8002/api"
info = requests.get(f"{B}/debug/db-info").json()
assert info["database_name"] == "bancomanda_demo_screens", info
tok = requests.post(f"{B}/auth/login", json={"email": "demo@bancomanda.it", "password": "DemoBancomanda1"}).json()["access_token"]
S = requests.Session()
S.headers["Authorization"] = f"Bearer {tok}"
today = datetime.date.today().isoformat()

cats = {}
for i, n in enumerate(["Antipasti", "Primi", "Secondi", "Contorni", "Dolci"]):
    cats[n] = S.post(f"{B}/categories", json={"name": n, "order": i}).json()["id"]

dishes_def = [
    ("Antipasti", "Tagliere di salumi e formaggi", 12.0, True, [], ["latte"]),
    ("Antipasti", "Bruschette al pomodoro", 6.0, False, ["vegano"], ["glutine"]),
    ("Primi", "Lasagne alla bolognese", 11.0, True, [], ["glutine", "uova", "latte", "sedano"]),
    ("Primi", "Spaghetti alle vongole", 13.0, False, [], ["glutine", "molluschi"]),
    ("Primi", "Risotto ai funghi porcini", 12.0, True, ["vegetariano", "senza_glutine"], ["latte", "sedano"]),
    ("Primi", "Gnocchi al pesto", 10.0, False, ["vegetariano", "Ricetta della nonna"], ["glutine", "latte", "frutta_a_guscio"]),
    ("Secondi", "Cotoletta alla milanese", 14.0, True, [], ["glutine", "uova"]),
    ("Secondi", "Polpette al sugo", 10.0, False, [], ["glutine", "uova", "latte"]),
    ("Secondi", "Salmone al forno", 15.0, False, ["senza_glutine"], ["pesce"]),
    ("Contorni", "Patate al forno", 4.5, False, ["vegano"], []),
    ("Contorni", "Verdure grigliate", 5.0, False, ["vegano", "senza_glutine"], []),
    ("Dolci", "Tiramisù della casa", 5.5, True, ["novita"], ["glutine", "uova", "latte"]),
    ("Dolci", "Panna cotta ai frutti di bosco", 5.0, False, ["senza_glutine"], ["latte"]),
]
dishes = {}
for c, n, p, fav, tags, alg in dishes_def:
    dishes[n] = S.post(f"{B}/dishes", json={"name": n, "basePrice": p, "categoryId": cats[c], "isFavorite": fav, "tags": tags, "allergens": alg}).json()

menu = S.post(f"{B}/menus", json={"date": today}).json()
portions = [10, 15, 20, 12, 18, 14, 16, 15, 8, 25, 20, 15, 12]
for (c, n, p, *_), por in zip(dishes_def, portions):
    did = dishes[n]["id"]
    if did in {i["dishId"] for i in menu["items"]}:
        S.put(f"{B}/menus/{menu['id']}/items/{did}", json={"portions": por, "dailyPrice": p}).raise_for_status()
    else:
        S.post(f"{B}/menus/{menu['id']}/items", json={"dishId": did, "portions": por, "dailyPrice": p}).raise_for_status()

custs = {}
for n, ph in [("Marco Bianchi", "347 112 3344"), ("Studio Legale Ferri", "02 4455 6677"), ("Giulia Romano", "333 998 7766"),
              ("Luca Esposito", "349 221 5566"), ("Francesca Conti", "338 776 1122"), ("Officina Moretti", "02 3344 5566")]:
    extra = {"customerType": "societa", "partitaIva": "01234567890"} if n.startswith(("Studio", "Officina")) else {}
    custs[n] = S.post(f"{B}/customers", json={"name": n, "phone": ph, **extra}).json()["id"]

# (cliente, canale, servizio, ora, piatti, stato, pagato, note, indici piatti in cucina)
orders = [
    (None, "persona", "in_sede", "13:00", [("Cotoletta alla milanese", 1), ("Patate al forno", 1), ("Tiramisù della casa", 1)], "in_attesa", True, "Tavolo 4", [0]),
    ("Giulia Romano", "persona", "in_sede", "12:45", [("Spaghetti alle vongole", 1), ("Verdure grigliate", 1)], "consegnato", True, "", []),
    ("Francesca Conti", "persona", "in_sede", "13:30", [("Tagliere di salumi e formaggi", 1), ("Lasagne alla bolognese", 1)], "in_attesa", True, "", [1]),
    ("Luca Esposito", "telefono", "da_ritirare", "13:15", [("Polpette al sugo", 2), ("Bruschette al pomodoro", 1)], "in_attesa", False, "", [0]),
    ("Marco Bianchi", "telefono", "da_ritirare", "12:30", [("Lasagne alla bolognese", 2), ("Tiramisù della casa", 2)], "pronto", True, "", [0]),
    ("Officina Moretti", "whatsapp", "da_consegnare", "12:15", [("Gnocchi al pesto", 4), ("Salmone al forno", 1), ("Panna cotta ai frutti di bosco", 3)], "in_preparazione", False, "Fattura a fine mese", [0, 1]),
    ("Studio Legale Ferri", "whatsapp", "da_consegnare", "13:00", [("Risotto ai funghi porcini", 3), ("Cotoletta alla milanese", 2), ("Patate al forno", 2)], "in_preparazione", True, "Citofono 2° piano", [0, 1]),
]
for cust, ch, st, t, items, status, paid, notes, kitchen in orders:
    body = {"channel": ch, "serviceType": st, "deliveryTime": t, "notes": notes}
    if cust:
        body.update({"customerId": custs[cust], "customerName": cust})
    o = S.post(f"{B}/orders", params={"menu_date": today}, json=body).json()
    for n, q in items:
        S.post(f"{B}/orders/{o['id']}/items", json={"dishId": dishes[n]["id"], "quantity": q}).raise_for_status()
    for idx in kitchen:
        S.patch(f"{B}/orders/{o['id']}/items/by-index/{idx}", json={"sendToKitchen": True}).raise_for_status()
    S.put(f"{B}/orders/{o['id']}/status", json={"status": status}).raise_for_status()
    if not paid:
        S.put(f"{B}/orders/{o['id']}/payment", json={"isPaid": False}).raise_for_status()

# Alcune porzioni gia pronte in cucina (lasagne di Marco Bianchi)
o = [x for x in S.get(f"{B}/orders", params={"menu_date": today}).json() if x.get("customerName") == "Marco Bianchi"][0]
S.put(f"{B}/orders/{o['id']}/items/by-index/0/portion/0/status", json={"itemStatus": "ready"}).raise_for_status()
S.put(f"{B}/orders/{o['id']}/items/by-index/0/portion/1/status", json={"itemStatus": "ready"}).raise_for_status()

# Porzioni iniziali per i piatti preferiti (aggiunti in automatico) — solo DB demo
mdb = MongoClient("mongodb://localhost:27017")["bancomanda_demo_screens"]
m = mdb.daily_menus.find_one()
init = dict(zip([d[1] for d in dishes_def], portions))
for i in m["items"]:
    if i.get("initialPortions") is None:
        i["initialPortions"] = init[i["dishName"]]
mdb.daily_menus.update_one({"_id": m["_id"]}, {"$set": {"items": m["items"]}})
print("seeded", today, len(S.get(f"{B}/orders", params={"menu_date": today}).json()), "orders")
