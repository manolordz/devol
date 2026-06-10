import asyncio
from typing import Any, Optional, Tuple

from fastapi import APIRouter
from pydantic import BaseModel
from sqlmodel import Session, select

from database import engine
from models.db import StoreConfig
from scrapers.shopify import ShopifyScraper
from scrapers.playwright_base import PlaywrightScraper
from scrapers.allu import AlluScraper

router = APIRouter()


class SearchRequest(BaseModel):
    fields: dict[str, Any] = {}
    store_ids: list[str] = []


def _load_stores() -> list[dict]:
    with Session(engine) as session:
        stores = session.exec(select(StoreConfig)).all()
        return [s.to_dict() for s in stores]


def _get_scraper(store: dict):
    scraper_type = store.get("type", "shopify")
    if scraper_type == "shopify":
        return ShopifyScraper(store)
    elif scraper_type == "allu":
        return AlluScraper(store)
    elif scraper_type in ("playwright", "static"):
        return PlaywrightScraper(store)
    return ShopifyScraper(store)


def _build_query(fields: dict[str, Any]) -> str:
    skip_fields = {"price_min", "price_max", "condition"}
    parts = []
    for key, value in fields.items():
        if key in skip_fields:
            continue
        if value and str(value).strip() and str(value).strip().lower() != "any":
            parts.append(str(value).strip())
    return " ".join(parts)


async def _search_store(scraper, query: str, filters: dict) -> Tuple[list, Optional[str]]:
    try:
        results = await scraper.search(query, filters)
        return results, None
    except Exception as e:
        return [], str(e)


@router.post("/search")
async def search(request: SearchRequest):
    all_stores = _load_stores()
    enabled_stores = [s for s in all_stores if s.get("enabled", True)]

    if request.store_ids:
        enabled_stores = [s for s in enabled_stores if s["id"] in request.store_ids]

    query_string = _build_query(request.fields)
    filters = {k: v for k, v in request.fields.items() if v}

    scrapers = [_get_scraper(store) for store in enabled_stores]
    tasks = [_search_store(scraper, query_string, filters) for scraper in scrapers]

    store_results = await asyncio.gather(*tasks)

    all_results = []
    errors: dict[str, str] = {}

    for store, (results, error) in zip(enabled_stores, store_results):
        if error:
            errors[store["id"]] = error
        all_results.extend(results)

    all_results.sort(key=lambda r: r.similarity_score, reverse=True)

    exact = [r.to_dict() for r in all_results if r.similarity_score >= 0.8]
    similar = [r.to_dict() for r in all_results if 0.4 <= r.similarity_score < 0.8]

    return {
        "query_string": query_string,
        "exact": exact,
        "similar": similar,
        "stores_searched": [s["id"] for s in enabled_stores],
        "errors": errors,
    }
