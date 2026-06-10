import json
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.db import SavedSearch

router = APIRouter()


class SavedSearchCreate(BaseModel):
    name: Optional[str] = None
    query_string: str = ""
    fields: dict[str, Any] = {}
    store_ids: list[str] = []
    results: dict[str, Any] = {}


class SavedSearchUpdate(BaseModel):
    name: Optional[str] = None


def _to_summary(item: SavedSearch) -> dict:
    results = json.loads(item.results_json or "{}")
    return {
        "id": item.id,
        "name": item.name,
        "query_string": item.query_string,
        "fields": json.loads(item.fields_json or "{}"),
        "store_ids": json.loads(item.store_ids_json or "[]"),
        "exact_count": len(results.get("exact", [])),
        "similar_count": len(results.get("similar", [])),
        "created_at": item.created_at,
    }


def _to_detail(item: SavedSearch) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "query_string": item.query_string,
        "fields": json.loads(item.fields_json or "{}"),
        "store_ids": json.loads(item.store_ids_json or "[]"),
        "results": json.loads(item.results_json or "{}"),
        "created_at": item.created_at,
    }


@router.get("/saved-searches")
def list_saved_searches(session: Session = Depends(get_session)):
    items = session.exec(
        select(SavedSearch).order_by(SavedSearch.created_at.desc())
    ).all()
    return [_to_summary(item) for item in items]


@router.get("/saved-searches/{saved_id}")
def get_saved_search(saved_id: int, session: Session = Depends(get_session)):
    item = session.get(SavedSearch, saved_id)
    if not item:
        raise HTTPException(status_code=404, detail="Saved search not found")
    return _to_detail(item)


@router.post("/saved-searches", status_code=201)
def create_saved_search(data: SavedSearchCreate, session: Session = Depends(get_session)):
    item = SavedSearch(
        name=data.name,
        query_string=data.query_string,
        fields_json=json.dumps(data.fields, ensure_ascii=False),
        store_ids_json=json.dumps(data.store_ids),
        results_json=json.dumps(data.results, ensure_ascii=False),
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return _to_detail(item)


@router.patch("/saved-searches/{saved_id}")
def update_saved_search(
    saved_id: int, data: SavedSearchUpdate, session: Session = Depends(get_session)
):
    item = session.get(SavedSearch, saved_id)
    if not item:
        raise HTTPException(status_code=404, detail="Saved search not found")
    if data.name is not None:
        item.name = data.name
    session.add(item)
    session.commit()
    session.refresh(item)
    return _to_detail(item)


@router.delete("/saved-searches/{saved_id}", status_code=204)
def delete_saved_search(saved_id: int, session: Session = Depends(get_session)):
    item = session.get(SavedSearch, saved_id)
    if not item:
        raise HTTPException(status_code=404, detail="Saved search not found")
    session.delete(item)
    session.commit()
