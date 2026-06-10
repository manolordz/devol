from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.db import StoreConfig

router = APIRouter()


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


@router.get("/stores")
def get_stores(session: Session = Depends(get_session)):
    stores = session.exec(select(StoreConfig)).all()
    return [s.to_dict() for s in stores]


@router.post("/stores", status_code=201)
def create_store(store: StoreCreate, session: Session = Depends(get_session)):
    if session.get(StoreConfig, store.id):
        raise HTTPException(status_code=409, detail=f"Store with id '{store.id}' already exists")
    db_store = StoreConfig(**store.model_dump())
    session.add(db_store)
    session.commit()
    session.refresh(db_store)
    return db_store.to_dict()


@router.patch("/stores/{store_id}")
def update_store(store_id: str, update: StoreUpdate, session: Session = Depends(get_session)):
    db_store = session.get(StoreConfig, store_id)
    if not db_store:
        raise HTTPException(status_code=404, detail="Store not found")
    patch = {k: v for k, v in update.model_dump().items() if v is not None}
    for key, value in patch.items():
        setattr(db_store, key, value)
    session.add(db_store)
    session.commit()
    session.refresh(db_store)
    return db_store.to_dict()


@router.delete("/stores/{store_id}", status_code=204)
def delete_store(store_id: str, session: Session = Depends(get_session)):
    db_store = session.get(StoreConfig, store_id)
    if not db_store:
        raise HTTPException(status_code=404, detail="Store not found")
    session.delete(db_store)
    session.commit()
