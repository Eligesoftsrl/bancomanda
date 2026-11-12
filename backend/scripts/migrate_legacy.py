"""Copia i dati di Giorgio Bistrot dalla vecchia app (sola lettura via API) al nuovo database multi-locale.

Uso: RAILWAY_MONGO_URL=... python scripts/migrate_legacy.py [--db NOME] [--dry-run] [--sync]
Il locale storico usa documenti senza tenant_id: vengono sostituiti solo quelli.
--sync: aggiorna/aggiunge per id senza cancellare nulla (i campi presenti solo nel nuovo db restano).
"""
import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import requests
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne

load_dotenv(Path(__file__).parent.parent / ".env")

SOURCE_API = "https://bancos-receipt.emergent.host/api"
SOURCES = {
    "categories": "categories",
    "dishes": "dishes?active_only=false",
    "customers": "customers?limit=1000000",
    "orders": "orders?limit=1000000",
    "daily_menus": "menus?limit=1000000",
    "missed_sales": "missed-sales?limit=1000000",
}
DATE_FIELDS = ("createdAt", "publishedAt")
LEGACY = {"tenant_id": None}


def fetch_source():
    data = {}
    for col, path in SOURCES.items():
        r = requests.get(f"{SOURCE_API}/{path}", timeout=120)
        r.raise_for_status()
        data[col] = r.json()
        print(f"[LETTURA] {col}: {len(data[col])}")
    return data


def to_doc(col, item):
    doc = {k: v for k, v in item.items() if k != "id"}
    doc["_id"] = ObjectId(item["id"])
    for f in DATE_FIELDS:
        if isinstance(doc.get(f), str):
            doc[f] = datetime.fromisoformat(doc[f])
    if col == "dishes":
        doc.setdefault("tags", [])
        doc.setdefault("allergens", [])
    return doc


def find_target_db(client, name):
    if name:
        return client[name]
    found = [n for n in client.list_database_names()
             if n not in ("admin", "local", "config") and client[n].tenants.find_one({"legacy_data": True})]
    if len(found) != 1:
        sys.exit(f"[ERRORE] Database con locale storico trovati: {found}. Indica --db.")
    return client[found[0]]


def sync(db, docs, existing, dry_run):
    for col, items in docs.items():
        current = {d["_id"]: d for d in existing[col]}
        new = sum(1 for d in items if d["_id"] not in current)
        only_target = len(set(current) - {d["_id"] for d in items})
        print(f"[SYNC] {col}: nuovi {new}, solo nel nuovo db (lasciati intatti) {only_target}")
        if dry_run or not items:
            continue
        ops = [UpdateOne({"_id": d["_id"]}, {"$set": {k: v for k, v in d.items() if k != "_id"}}, upsert=True) for d in items]
        r = db[col].bulk_write(ops, ordered=False)
        print(f"[SYNC] {col}: inseriti {r.upserted_count}, aggiornati {r.modified_count}")
    print("[DRY-RUN] nessuna modifica" if dry_run else "[FATTO]")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--sync", action="store_true")
    args = ap.parse_args()

    target_url = os.environ["RAILWAY_MONGO_URL"]
    data = fetch_source()
    docs = {col: [to_doc(col, x) for x in items] for col, items in data.items()}

    client = MongoClient(target_url, serverSelectionTimeoutMS=20000)
    db = find_target_db(client, args.db)
    tenant = db.tenants.find_one({"legacy_data": True})
    if not tenant:
        sys.exit("[ERRORE] Locale storico non presente nel database di destinazione")
    print(f"[DESTINAZIONE] db={db.name} locale='{tenant['name']}'")

    for col, items in docs.items():
        ids = [d["_id"] for d in items]
        clash = db[col].count_documents({"_id": {"$in": ids}, "tenant_id": {"$ne": None}})
        if clash:
            sys.exit(f"[ERRORE] {col}: {clash} id già usati da altri locali, interrotto")
        unique_date = any(ix.get("unique") and list(ix["key"]) == ["date"] for ix in db[col].list_indexes())
        if unique_date and db[col].count_documents({"tenant_id": {"$ne": None}}):
            sys.exit(f"[ERRORE] {col}: indice unico su 'date' in conflitto con altri locali")

    existing = {col: list(db[col].find(LEGACY)) for col in docs}
    print("[ATTUALI] " + ", ".join(f"{c}={len(v)}" for c, v in existing.items()))
    if args.sync:
        sync(db, docs, existing, args.dry_run)
        return
    if args.dry_run:
        print("[DRY-RUN] nessuna modifica")
        return

    backup = Path(__file__).parent.parent / f"migration_backup_{datetime.now():%Y%m%d_%H%M%S}.json"
    backup.write_text(json.dumps(existing, default=str))
    print(f"[BACKUP] dati sostituiti salvati in {backup}")

    for col, items in docs.items():
        removed = db[col].delete_many(LEGACY).deleted_count
        if items:
            db[col].insert_many(items, ordered=False)
        print(f"[COPIA] {col}: rimossi {removed}, inseriti {len(items)}")

    print("[VERIFICA]")
    ok = True
    for col, items in docs.items():
        n = db[col].count_documents(LEGACY)
        ok &= n == len(items)
        print(f"  {col}: {n}/{len(items)} {'OK' if n == len(items) else 'DIFFERENZA'}")
    print("[FATTO]" if ok else "[ATTENZIONE] conteggi diversi")


if __name__ == "__main__":
    main()
