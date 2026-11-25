"""Conversione di categorie usate come ingredienti in gruppi di scelta + piatto componibile (locale storico).

Uso: RAILWAY_MONGO_URL=... python scripts/composable_conversion.py [--dry-run]
Rieseguibile: non duplica nulla e non tocca le modifiche fatte dall'app (prezzi, nomi).
I piatti convertiti restano nello storico (solo disattivati) e gli ordini passati non cambiano.
"""
import argparse
import os
import sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from bson import ObjectId
from pymongo import MongoClient

sys.path.insert(0, os.path.dirname(__file__))
from migrate_legacy import LEGACY, find_target_db  # noqa: E402

FIT = {
    "key": "fit",
    "dish": {"name": "Piatto Fit", "description": "Scegli la base e aggiungi le proteine che preferisci"},
    "category": {"name": "Fit", "order": 10},
    "groups": [
        {"name": "Base", "source": "Base Fit", "minSelect": 1, "maxSelect": 1, "allowRepeat": False, "order": 1},
        {"name": "Proteine", "source": "Proteine Fit", "minSelect": 0, "maxSelect": None, "allowRepeat": True, "order": 2},
    ],
    "test_groups": ("Fit", "Base"),  # prove fatte a mano dall'utente prima della conversione
}


def log(msg, dry):
    print(("[DRY-RUN] " if dry else "") + msg)


def convert(db, cfg=FIT, dry=False):
    now = datetime.now(timezone.utc)
    key = cfg["key"]
    for g in db.option_groups.find({**LEGACY, "conversionKey": {"$exists": False}, "archived": {"$ne": True}, "name": {"$in": list(cfg["test_groups"])}}):
        log(f"archivio gruppo di prova '{g['name']}' -> 'PROVA {g['name']}'", dry)
        if not dry:
            db.option_groups.update_one({"_id": g["_id"]}, {"$set": {"archived": True, "name": f"PROVA {g['name']}"}})

    cat = db.categories.find_one({**LEGACY, "name": cfg["category"]["name"]})
    if not cat:
        cat = {"_id": ObjectId(), "name": cfg["category"]["name"], "order": cfg["category"]["order"], "createdAt": now}
        log(f"creo categoria '{cat['name']}'", dry)
        if not dry:
            db.categories.insert_one(cat)

    dish = db.dishes.find_one({**LEGACY, "conversionKey": key})
    dish_id = dish["_id"] if dish else ObjectId()
    group_ids = []
    for gcfg in cfg["groups"]:
        gkey = f"{key}:{gcfg['name']}"
        group = db.option_groups.find_one({**LEGACY, "conversionKey": gkey})
        if not group:
            group = {"_id": ObjectId(), "name": gcfg["name"], "minSelect": gcfg["minSelect"], "maxSelect": gcfg["maxSelect"],
                     "allowRepeat": gcfg["allowRepeat"], "options": [], "order": gcfg["order"], "conversionKey": gkey, "createdAt": now}
            log(f"creo gruppo '{gcfg['name']}' (min {gcfg['minSelect']}, max {gcfg['maxSelect'] or 'nessun limite'}, doppie {gcfg['allowRepeat']})", dry)
            if not dry:
                db.option_groups.insert_one(group)
        group_ids.append(str(group["_id"]))
        src = db.categories.find_one({**LEGACY, "name": gcfg["source"]})
        if not src:
            log(f"categoria '{gcfg['source']}' non trovata: nessun ingrediente da convertire", dry)
            continue
        for d in db.dishes.find({**LEGACY, "categoryId": str(src["_id"]), "convertedTo": {"$exists": False}}).sort("_id", 1):
            opt = {"id": str(ObjectId()), "name": d["name"], "price": round(float(d.get("basePrice", 0)), 2),
                   "allergens": d.get("allergens") or [], "active": True}
            log(f"  '{d['name']}' {opt['price']:.2f} € -> ingrediente di {gcfg['name']}; piatto disattivato", dry)
            if not dry:
                db.option_groups.update_one({"_id": group["_id"]}, {"$push": {"options": opt}})
                db.dishes.update_one({"_id": d["_id"]}, {"$set": {"active": False, "isFavorite": False, "convertedTo": {
                    "dishId": str(dish_id), "groupId": str(group["_id"]), "optionId": opt["id"]}}})

    if not dish:
        dish = {"_id": dish_id, **cfg["dish"], "basePrice": 0.0, "categoryId": str(cat["_id"]), "categoryName": cat["name"],
                "active": True, "isFavorite": True, "tags": [], "allergens": [], "isComposable": True,
                "optionGroupIds": group_ids, "conversionKey": key, "createdAt": now}
        log(f"creo piatto componibile '{dish['name']}' nella categoria '{cat['name']}' con i gruppi {[g['name'] for g in cfg['groups']]}", dry)
        if not dry:
            db.dishes.insert_one(dish)


def apply_menus(db, from_date=None, dry=False):
    """Nei menu da oggi in poi sostituisce gli ingredienti con il piatto componibile (porzioni = somma delle basi)."""
    from_date = from_date or datetime.now(ZoneInfo("Europe/Rome")).strftime("%Y-%m-%d")
    converted = {str(d["_id"]): d["convertedTo"] for d in db.dishes.find({**LEGACY, "convertedTo": {"$exists": True}})}
    if not converted:
        return
    targets = {c["dishId"] for c in converted.values()}
    dishes = {str(d["_id"]): d for d in db.dishes.find({"_id": {"$in": [ObjectId(t) for t in targets]}})}
    groups = {str(g["_id"]): g for g in db.option_groups.find({**LEGACY, "_id": {"$in": [ObjectId(c["groupId"]) for c in converted.values()]}})}
    for menu in db.daily_menus.find({**LEGACY, "date": {"$gte": from_date}, "items.dishId": {"$in": list(converted)}}):
        items, changed = [], False
        for it in menu["items"]:
            conv = converted.get(it["dishId"])
            if not conv:
                items.append(it)
                continue
            changed = True
            target = dishes.get(conv["dishId"])
            if not target:
                continue
            comp = next((x for x in items if x["dishId"] == conv["dishId"]), None)
            if comp is None:
                comp = {"dishId": conv["dishId"], "dishName": target["name"], "categoryId": target.get("categoryId"),
                        "categoryName": target.get("categoryName"), "portions": 0, "initialPortions": 0,
                        "dailyPrice": float(target.get("basePrice", 0)), "notes": "", "unavailableOptionIds": []}
                items.append(comp)
            if groups.get(conv["groupId"], {}).get("minSelect", 0) >= 1:  # ogni piatto usa una base
                comp["portions"] += int(it.get("portions") or 0)
                comp["initialPortions"] += int(it.get("initialPortions") or it.get("portions") or 0)
            if int(it.get("portions") or 0) <= 0:
                comp["unavailableOptionIds"].append(conv["optionId"])
        if changed:
            fits = [x for x in items if x["dishId"] in targets]
            log(f"menu {menu['date']}: ingredienti sostituiti da {[(x['dishName'], x['portions']) for x in fits]}", dry)
            if not dry:
                db.daily_menus.update_one({"_id": menu["_id"]}, {"$set": {"items": items}})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    db = find_target_db(MongoClient(os.environ["RAILWAY_MONGO_URL"], serverSelectionTimeoutMS=20000), args.db)
    print(f"[DESTINAZIONE] db={db.name}")
    convert(db, dry=args.dry_run)
    apply_menus(db, dry=args.dry_run)
    print("[DRY-RUN] nessuna modifica" if args.dry_run else "[FATTO]")


if __name__ == "__main__":
    main()
