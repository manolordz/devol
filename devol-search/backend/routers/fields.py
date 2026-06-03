import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()
CONFIG_PATH = Path(__file__).parent.parent / "config" / "search_fields.json"


class FieldCreate(BaseModel):
    id: str
    label: str
    label_es: str
    type: str
    options: Optional[list[str]] = None
    enabled: bool = True


class FieldUpdate(BaseModel):
    label: Optional[str] = None
    label_es: Optional[str] = None
    type: Optional[str] = None
    options: Optional[list[str]] = None
    enabled: Optional[bool] = None


def _load() -> list[dict]:
    with open(CONFIG_PATH) as f:
        return json.load(f)


def _save(data: list[dict]):
    with open(CONFIG_PATH, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


@router.get("/fields")
def get_fields():
    return _load()


@router.post("/fields", status_code=201)
def create_field(field: FieldCreate):
    fields = _load()
    if any(f["id"] == field.id for f in fields):
        raise HTTPException(status_code=409, detail=f"Field with id '{field.id}' already exists")
    fields.append(field.model_dump())
    _save(fields)
    return field.model_dump()


@router.patch("/fields/{field_id}")
def update_field(field_id: str, update: FieldUpdate):
    fields = _load()
    for i, f in enumerate(fields):
        if f["id"] == field_id:
            patch = {k: v for k, v in update.model_dump().items() if v is not None}
            fields[i].update(patch)
            _save(fields)
            return fields[i]
    raise HTTPException(status_code=404, detail="Field not found")


@router.delete("/fields/{field_id}", status_code=204)
def delete_field(field_id: str):
    fields = _load()
    filtered = [f for f in fields if f["id"] != field_id]
    if len(filtered) == len(fields):
        raise HTTPException(status_code=404, detail="Field not found")
    _save(filtered)
