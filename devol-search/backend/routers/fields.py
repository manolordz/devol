import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.db import SearchFieldConfig

router = APIRouter()


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


@router.get("/fields")
def get_fields(session: Session = Depends(get_session)):
    fields = session.exec(select(SearchFieldConfig)).all()
    return [f.to_dict() for f in fields]


@router.post("/fields", status_code=201)
def create_field(field: FieldCreate, session: Session = Depends(get_session)):
    if session.get(SearchFieldConfig, field.id):
        raise HTTPException(status_code=409, detail=f"Field with id '{field.id}' already exists")
    data = field.model_dump()
    options = data.pop("options", None)
    db_field = SearchFieldConfig(
        options_json=json.dumps(options) if options is not None else None,
        **data,
    )
    session.add(db_field)
    session.commit()
    session.refresh(db_field)
    return db_field.to_dict()


@router.patch("/fields/{field_id}")
def update_field(field_id: str, update: FieldUpdate, session: Session = Depends(get_session)):
    db_field = session.get(SearchFieldConfig, field_id)
    if not db_field:
        raise HTTPException(status_code=404, detail="Field not found")
    patch = {k: v for k, v in update.model_dump().items() if v is not None}
    if "options" in patch:
        options = patch.pop("options")
        db_field.options_json = json.dumps(options) if options is not None else None
    for key, value in patch.items():
        setattr(db_field, key, value)
    session.add(db_field)
    session.commit()
    session.refresh(db_field)
    return db_field.to_dict()


@router.delete("/fields/{field_id}", status_code=204)
def delete_field(field_id: str, session: Session = Depends(get_session)):
    db_field = session.get(SearchFieldConfig, field_id)
    if not db_field:
        raise HTTPException(status_code=404, detail="Field not found")
    session.delete(db_field)
    session.commit()
