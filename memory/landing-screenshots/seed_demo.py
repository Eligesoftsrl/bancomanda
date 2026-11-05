import requests, datetime
B = "http://127.0.0.1:8002/api"
info = requests.get(f"{B}/debug/db-info").json()
assert info["database_name"] == "bancomanda_demo_screens", info
today = datetime.date.today().isoformat()

cats = {}
for i, n in enumerate(["Antipasti", "Primi", "Secondi", "Contorni", "Dolci"]):
    cats[n] = requests.post(f"{B}/categories", json={"name": n, "order": i}).json()["id"]

dishes_def = [
    ("Antipasti", "Tagliere di salumi e formaggi", 12.0, True),
    ("Antipasti", "Bruschette al pomodoro", 6.0, False),
    ("Primi", "Lasagne alla bolognese", 11.0, True),
    ("Primi", "Spaghetti alle vongole", 13.0, False),
    ("Primi", "Risotto ai funghi porcini", 12.0, True),
    ("Primi", "Gnocchi al pesto", 10.0, False),
    ("Secondi", "Cotoletta alla milanese", 14.0, True),
    ("Secondi", "Polpette al sugo", 10.0, False),
    ("Secondi", "Salmone al forno", 15.0, False),
    ("Contorni", "Patate al forno", 4.5, False),
    ("Contorni", "Verdure grigliate", 5.0, False),
    ("Dolci", "Tiramisù della casa", 5.5, True),
    ("Dolci", "Panna cotta ai frutti di bosco", 5.0, False),
]
dishes = {}
for c, n, p, fav in dishes_def:
    dishes[n] = requests.post(f"{B}/dishes", json={"name": n, "basePrice": p, "categoryId": cats[c], "isFavorite": fav}).json()

menu = requests.post(f"{B}/menus", json={"date": today}).json()
portions = [10, 15, 20, 12, 18, 14, 16, 15, 8, 25, 20, 15, 12]
for (c, n, p, _), por in zip(dishes_def, portions):
    did = dishes[n]["id"]
    if did in {i["dishId"] for i in menu["items"]}:
        r = requests.put(f"{B}/menus/{menu['id']}/items/{did}", json={"portions": por, "dailyPrice": p})
    else:
        r = requests.post(f"{B}/menus/{menu['id']}/items", json={"dishId": did, "portions": por, "dailyPrice": p})
    r.raise_for_status()

custs = {}
for n, ph in [("Marco Bianchi", "347 112 3344"), ("Studio Legale Ferri", "02 4455 6677"), ("Giulia Romano", "333 998 7766"),
              ("Luca Esposito", "349 221 5566"), ("Francesca Conti", "338 776 1122"), ("Officina Moretti", "02 3344 5566")]:
    custs[n] = requests.post(f"{B}/customers", json={"name": n, "phone": ph, **({"customerType": "societa", "partitaIva": "01234567890"} if n.startswith(("Studio", "Officina")) else {})}).json()["id"]

orders = [
    (None, "persona", "in_sede", "13:00", [("Cotoletta alla milanese", 1), ("Patate al forno", 1), ("Tiramisù della casa", 1)], "in_attesa", True, "Tavolo 4"),
    ("Giulia Romano", "persona", "in_sede", "12:45", [("Spaghetti alle vongole", 1), ("Verdure grigliate", 1)], "consegnato", True, ""),
    ("Francesca Conti", "persona", "in_sede", "13:30", [("Tagliere di salumi e formaggi", 1), ("Lasagne alla bolognese", 1)], "in_attesa", True, ""),
    ("Luca Esposito", "telefono", "da_ritirare", "13:15", [("Polpette al sugo", 2), ("Bruschette al pomodoro", 1)], "in_attesa", False, ""),
    ("Marco Bianchi", "telefono", "da_ritirare", "12:30", [("Lasagne alla bolognese", 2), ("Tiramisù della casa", 2)], "pronto", True, ""),
    ("Officina Moretti", "whatsapp", "da_consegnare", "12:15", [("Gnocchi al pesto", 4), ("Salmone al forno", 1), ("Panna cotta ai frutti di bosco", 3)], "in_preparazione", False, "Fattura a fine mese"),
    ("Studio Legale Ferri", "whatsapp", "da_consegnare", "13:00", [("Risotto ai funghi porcini", 3), ("Cotoletta alla milanese", 2), ("Patate al forno", 2)], "in_preparazione", True, "Citofono 2° piano"),
]
for cust, ch, st, t, items, status, paid, notes in orders:
    body = {"channel": ch, "serviceType": st, "deliveryTime": t, "notes": notes}
    if cust:
        body.update({"customerId": custs[cust], "customerName": cust})
    o = requests.post(f"{B}/orders", params={"menu_date": today}, json=body).json()
    for n, q in items:
        requests.post(f"{B}/orders/{o['id']}/items", json={"dishId": dishes[n]["id"], "quantity": q}).raise_for_status()
    requests.put(f"{B}/orders/{o['id']}/status", json={"status": status}).raise_for_status()
    if not paid:
        requests.put(f"{B}/orders/{o['id']}/payment", json={"isPaid": False}).raise_for_status()
print("seeded", today, len(requests.get(f"{B}/orders", params={"menu_date": today}).json()), "orders")
