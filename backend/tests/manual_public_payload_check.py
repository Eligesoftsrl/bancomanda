# Read-only check of _build_public_payload for a composable dish (Pizzeria Napoli), in-memory menu copy.
import asyncio
import json
import sys

sys.path.insert(0, "/app/backend")
import server  # noqa: E402
from tenancy import current_tenant, TenantContext  # noqa: E402

TID = "6aec83f079163e42b25d0680"


async def main():
    current_tenant.set(TenantContext(TID, False))
    today = server._rome_today_iso()
    menu = await server.db.daily_menus.find_one({"date": today})
    cat = "Insalate"
    real = server.db

    class FakeCur:
        def __init__(self, docs): self.docs = docs
        def sort(self, *a, **k): return self
        def __aiter__(self):
            async def gen():
                for d in self.docs:
                    yield d
            return gen()

    class FakeCats:
        def find(self, *a, **k): return FakeCur([{"name": cat, "order": 0}])

    class DB:
        categories = FakeCats()
        def __getattr__(self, n): return getattr(real, n)
    server.db = DB()
    menu = dict(menu)
    menu["isPublished"] = True
    menu["items"] = [dict(i, categoryName=cat) for i in menu["items"] if i["dishName"] == "TEST_Piatto Fit"]
    p = await server._build_public_payload(menu, today)
    for s in p["sections"]:
        for it in s["items"]:
            if it["name"] == "TEST_Piatto Fit":
                print(json.dumps(it, ensure_ascii=False, indent=1))


asyncio.run(main())
