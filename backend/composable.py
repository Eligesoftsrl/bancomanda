"""Piatti componibili: liste di scelta (es. Base, Proteine) e composizione dei piatti negli ordini."""
from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from tenancy import ScopedDatabase


class OptionItem(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=80)
    price: float = Field(0, ge=0, le=1000)
    allergens: List[str] = []
    active: bool = True


class OptionGroupIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    minSelect: int = Field(0, ge=0, le=50)
    maxSelect: Optional[int] = Field(None, ge=1, le=50)  # None = nessun limite
    allowRepeat: bool = False
    options: List[OptionItem] = []
    order: int = 0


class OptionGroup(OptionGroupIn):
    id: str


class Selection(BaseModel):
    optionId: str
    quantity: int = Field(1, ge=1, le=50)


class PresetChanges(BaseModel):
    removed: List[str] = []  # ingredienti tolti dalla ricetta del piatto già composto
    added: List[str] = []    # ingredienti aggiunti (con supplemento)


class CompositionEntry(BaseModel):
    groupId: str
    groupName: str
    optionId: str
    name: str
    price: float
    quantity: int = 1


router = APIRouter(prefix="/option-groups", tags=["Piatti componibili"])
ACTIVE = {"archived": {"$ne": True}}


def _db(request: Request) -> ScopedDatabase:
    return ScopedDatabase(request.app.state.db)


def _out(doc: dict) -> OptionGroup:
    return OptionGroup(id=str(doc["_id"]), **{k: v for k, v in doc.items() if k in OptionGroupIn.model_fields})


def _clean(body: OptionGroupIn) -> dict:
    if body.maxSelect is not None and body.maxSelect < body.minSelect:
        raise HTTPException(status_code=400, detail="Il massimo non può essere minore del minimo")
    names = [o.name.strip().lower() for o in body.options]
    if len(names) != len(set(names)):
        raise HTTPException(status_code=400, detail="Due ingredienti hanno lo stesso nome")
    data = body.model_dump()
    data["name"] = body.name.strip()
    data["options"] = [
        {**o.model_dump(), "id": o.id or str(ObjectId()), "name": o.name.strip(), "price": round(o.price, 2)}
        for o in body.options
    ]
    return data


@router.get("", response_model=List[OptionGroup])
async def list_groups(request: Request):
    docs = await _db(request).option_groups.find(ACTIVE).sort([("order", 1), ("name", 1)]).to_list(200)
    return [_out(d) for d in docs]


@router.post("", response_model=OptionGroup)
async def create_group(body: OptionGroupIn, request: Request):
    data = _clean(body)
    data["createdAt"] = datetime.now(timezone.utc)
    result = await _db(request).option_groups.insert_one(data)
    data["_id"] = result.inserted_id
    return _out(data)


@router.put("/{group_id}", response_model=OptionGroup)
async def update_group(group_id: str, body: OptionGroupIn, request: Request):
    db = _db(request)
    result = await db.option_groups.update_one({"_id": ObjectId(group_id), **ACTIVE}, {"$set": _clean(body)})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lista non trovata")
    return _out(await db.option_groups.find_one({"_id": ObjectId(group_id)}))


@router.delete("/{group_id}")
async def delete_group(group_id: str, request: Request):
    db = _db(request)
    # Anche i piatti disattivati: se riattivati resterebbero senza gruppo
    users = await db.dishes.find({"isComposable": True, "optionGroupIds": group_id}, {"name": 1}).to_list(20)
    if users:
        names = ", ".join(d["name"] for d in users)
        raise HTTPException(status_code=409, detail=f"Lista usata da: {names}. Scollegala prima dal piatto.")
    # Archiviazione (non cancellazione): gli ordini passati conservano comunque i nomi scelti
    result = await db.option_groups.update_one({"_id": ObjectId(group_id), **ACTIVE}, {"$set": {"archived": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lista non trovata")
    return {"message": "Lista eliminata"}


async def load_groups(db, group_ids: List[str]) -> List[dict]:
    """Gruppi del locale nell'ordine scelto per il piatto (ignora id non validi o di altri locali)."""
    oids = [ObjectId(g) for g in group_ids if ObjectId.is_valid(g)]
    docs = {str(d["_id"]): d for d in await db.option_groups.find({"_id": {"$in": oids}, **ACTIVE}).to_list(100)}
    return [docs[g] for g in group_ids if g in docs]


async def validate_group_ids(db, group_ids: List[str]) -> List[str]:
    found = await load_groups(db, group_ids)
    if len(found) != len(set(group_ids)):
        raise HTTPException(status_code=400, detail="Lista di scelta non trovata")
    return [str(g["_id"]) for g in found]


def build_composition(groups: List[dict], selections: List[Selection], unavailable: List[str], keep_ids=()) -> tuple:
    """Controlla le regole dei gruppi e restituisce (composizione, supplemento). Errori in italiano."""
    wanted: dict = {}
    for s in selections:
        wanted[s.optionId] = wanted.get(s.optionId, 0) + s.quantity
    composition, extra, used = [], 0.0, set()
    for g in groups:
        total = 0
        for opt in g.get("options", []):
            qty = wanted.get(opt["id"], 0)
            if not qty:
                continue
            used.add(opt["id"])
            kept = opt["id"] in keep_ids
            if not opt.get("active", True) and not kept:
                raise HTTPException(status_code=400, detail=f"{opt['name']} non è più disponibile")
            if opt["id"] in unavailable and not kept:
                raise HTTPException(status_code=400, detail=f"{opt['name']} è esaurito oggi")
            if qty > 1 and not g.get("allowRepeat"):
                raise HTTPException(status_code=400, detail=f"{opt['name']}: in {g['name']} non si può raddoppiare")
            total += qty
            extra += opt["price"] * qty
            composition.append({"groupId": str(g["_id"]), "groupName": g["name"], "optionId": opt["id"],
                                "name": opt["name"], "price": opt["price"], "quantity": qty})
        mn, mx = g.get("minSelect", 0), g.get("maxSelect")
        if total < mn:
            raise HTTPException(status_code=400, detail=f"Scegli {g['name']}" if mn == 1 else f"{g['name']}: scegline almeno {mn}")
        if mx is not None and total > mx:
            raise HTTPException(status_code=400, detail=f"{g['name']}: massimo {mx}")
    if set(wanted) - used:
        raise HTTPException(status_code=400, detail="Ingrediente non valido per questo piatto")
    return composition, round(extra, 2)


def _label(name: str, qty: int) -> str:
    return name if qty == 1 else f"{name} ×{qty}"


def preset_changes(groups: List[dict], preset: List[dict], composition: List[dict]) -> Optional[dict]:
    """Piatto già composto: cosa è stato tolto o aggiunto rispetto alla ricetta (None se non è già composto)."""
    if not preset:
        return None
    want = {p["optionId"]: p["quantity"] for p in preset}
    got = {c["optionId"]: c["quantity"] for c in composition}
    removed, added = [], []
    for g in groups:
        for o in g.get("options", []):
            diff = got.get(o["id"], 0) - want.get(o["id"], 0)
            if diff:
                (added if diff > 0 else removed).append(_label(o["name"], abs(diff)))
    return {"removed": removed, "added": added}


def preset_summary(groups: List[dict], preset: List[dict], unavailable: List[str] = ()) -> tuple:
    """Per il sito: (ingredienti della ricetta disponibili oggi, loro prezzo, loro allergeni, ingredienti mancanti oggi).
    Come nell'app: un ingrediente esaurito o disattivato esce dalla ricetta e dal prezzo."""
    want = {p["optionId"]: p["quantity"] for p in preset}
    names, extra, allergens, missing = [], 0.0, [], []
    for g in groups:
        for o in g.get("options", []):
            qty = want.get(o["id"], 0)
            if not qty:
                continue
            if not o.get("active", True) or o["id"] in unavailable:
                missing.append(o["name"])
                continue
            names.append(_label(o["name"], qty))
            extra += o["price"] * qty
            allergens += [a for a in o.get("allergens", []) if a not in allergens]
    return names, round(extra, 2), allergens, missing


def composition_extra(composition: List[dict]) -> float:
    return round(sum(c["price"] * c.get("quantity", 1) for c in composition or []), 2)


def _euro(v: float) -> str:
    return f"{v:.2f}".replace(".", ",") + " €"


def public_options(groups: List[dict], unavailable: List[str], recipe: Optional[dict] = None) -> tuple:
    """Per il sito: (supplemento minimo obbligatorio, liste pubbliche, testo descrittivo).
    recipe (optionId -> quantità) marca con inRecipe gli ingredienti del piatto già composto."""
    base, public, parts = 0.0, [], []
    for g in groups:
        opts = [o for o in g.get("options", []) if o.get("active", True) and o["id"] not in unavailable]
        if not opts:
            continue
        mn = g.get("minSelect", 0)
        floor = min(o["price"] for o in opts) if mn else 0.0
        base += floor * mn
        public.append({"name": g["name"], "required": mn > 0, "min": mn, "max": g.get("maxSelect"),
                       "allowRepeat": bool(g.get("allowRepeat")),
                       "options": [{"name": o["name"], "price": o["price"], "allergens": o.get("allergens", []),
                                    **({"inRecipe": recipe.get(o["id"], 0)} if recipe is not None else {})} for o in opts]})
        labels = [o["name"] + (f" +{_euro(o['price'] - floor)}" if o["price"] - floor > 0 else "") for o in opts]
        parts.append(f"{g['name']}: {', '.join(labels)}")
    return round(base, 2), public, " · ".join(parts)
