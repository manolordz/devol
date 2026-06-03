from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.db import Favorite

router = APIRouter()


class FavoriteCreate(BaseModel):
    store_id: str
    store_name: str
    product_title: str
    product_url: str
    image_url: Optional[str] = None
    price: Optional[float] = None
    currency: str = "JPY"
    notes: Optional[str] = None
    interested_clients: Optional[str] = None
    search_query: Optional[str] = None


class FavoriteUpdate(BaseModel):
    notes: Optional[str] = None
    interested_clients: Optional[str] = None


@router.get("/favorites")
def get_favorites(session: Session = Depends(get_session)):
    favorites = session.exec(select(Favorite).order_by(Favorite.created_at.desc())).all()
    return favorites


@router.post("/favorites", status_code=201)
def create_favorite(data: FavoriteCreate, session: Session = Depends(get_session)):
    favorite = Favorite(**data.model_dump())
    session.add(favorite)
    session.commit()
    session.refresh(favorite)
    return favorite


@router.patch("/favorites/{favorite_id}")
def update_favorite(favorite_id: int, data: FavoriteUpdate, session: Session = Depends(get_session)):
    favorite = session.get(Favorite, favorite_id)
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")
    if data.notes is not None:
        favorite.notes = data.notes
    if data.interested_clients is not None:
        favorite.interested_clients = data.interested_clients
    session.add(favorite)
    session.commit()
    session.refresh(favorite)
    return favorite


@router.delete("/favorites/{favorite_id}", status_code=204)
def delete_favorite(favorite_id: int, session: Session = Depends(get_session)):
    favorite = session.get(Favorite, favorite_id)
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")
    session.delete(favorite)
    session.commit()
