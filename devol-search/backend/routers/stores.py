import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()
CONFIG_PATH = Path(__file__).parent.parent / "config" / "stores.json"


class StoreCreate(BaseModel):
    id: str
    name: str
    url: str
    type: str
    search_url_template: str = ""
    enabled: bool = True


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    type: Optional[str] = None
    search_url_template: Optional[str] = None
    enabled: Optional[bool] = None


def _load() -> list[dict]:
    with open(CONFIG_PATH) as f:
        return json.load(f)


def _save(data: list[dict]):
    with open(CONFIG_PATH, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


@router.get("/stores")
def get_stores():
    return _load()


@router.post("/stores", status_code=201)
def create_store(store: StoreCreate):
    stores = _load()
    if any(s["id"] == store.id for s in stores):
        raise HTTPException(status_code=409, detail=f"Store with id '{store.id}' already exists")
    stores.append(store.model_dump())
    _save(stores)
    return store.model_dump()


@router.patch("/stores/{store_id}")
def update_store(store_id: str, update: StoreUpdate):
    stores = _load()
    for i, store in enumerate(stores):
        if store["id"] == store_id:
            patch = {k: v for k, v in update.model_dump().items() if v is not None}
            stores[i].update(patch)
            _save(stores)
            return stores[i]
    raise HTTPException(status_code=404, detail="Store not found")


@router.delete("/stores/{store_id}", status_code=204)
def delete_store(store_id: str):
    stores = _load()
    filtered = [s for s in stores if s["id"] != store_id]
    if len(filtered) == len(stores):
        raise HTTPException(status_code=404, detail="Store not found")
    _save(filtered)
