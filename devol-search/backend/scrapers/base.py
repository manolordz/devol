from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ProductResult:
    title: str
    url: str
    store_id: str
    store_name: str
    similarity_score: float
    image_url: Optional[str] = None
    price: Optional[float] = None
    currency: str = "JPY"
    similarity_reason: str = ""

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "url": self.url,
            "store_id": self.store_id,
            "store_name": self.store_name,
            "similarity_score": self.similarity_score,
            "image_url": self.image_url,
            "price": self.price,
            "currency": self.currency,
            "similarity_reason": self.similarity_reason,
        }


class BaseScraper(ABC):
    def __init__(self, store: dict):
        self.store = store
        self.store_id = store["id"]
        self.store_name = store["name"]
        self.store_url = store["url"]
        self.search_url_template = store.get("search_url_template", "")

    @abstractmethod
    async def search(self, query: str, filters: dict) -> list[ProductResult]:
        pass

    def _calculate_similarity(self, query: str, title: str) -> tuple[float, str]:
        if not query or not title:
            return 0.0, "No query or title"

        query_lower = query.lower()
        title_lower = title.lower()

        terms = [t for t in query_lower.split() if len(t) > 1]
        if not terms:
            return 0.0, "Empty query terms"

        matched = [t for t in terms if t in title_lower]
        ratio = len(matched) / len(terms)

        if ratio == 1.0:
            return 1.0, "Coincidencia exacta"
        elif ratio >= 0.7:
            missing = [t for t in terms if t not in matched]
            return 0.8, f"Coincide casi todo, falta: {', '.join(missing)}"
        elif ratio >= 0.5:
            matched_str = ", ".join(matched) if matched else "ninguno"
            return 0.6, f"Coincide parcialmente: {matched_str}"
        elif ratio >= 0.3:
            matched_str = ", ".join(matched) if matched else "ninguno"
            return 0.45, f"Coincidencia débil: {matched_str}"
        else:
            return 0.2, "Poca coincidencia"
