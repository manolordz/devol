import httpx

from .base import BaseScraper, ProductResult

# ALLU's storefront is a Nuxt SPA, but it talks to a public JSON API for
# search results — no headless browser needed. Discovered by inspecting the
# site's JS bundles (`loadSearchItems` -> POST /v5/items/search).
SEARCH_API_URL = "https://api.allu-official.com/v5/items/search"
ITEM_URL_TEMPLATE = "https://allu-official.com/jp/ja/market/items/{id}/"


class AlluScraper(BaseScraper):
    async def search(self, query: str, filters: dict) -> list[ProductResult]:
        results: list[ProductResult] = []

        if not query.strip():
            return results

        payload = {
            "keyword": query,
            "categories": [],
            "brands": [],
            "models": [],
            "ranks": [],
            "gender": [],
            "color": [],
            "shop": [],
            "order": 1,
            "sale": [],
            "search": 1,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    SEARCH_API_URL,
                    params={"page": 1, "limit": 50},
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                resp.raise_for_status()
                data = resp.json()

            # ALLU's search API already matches English brand names (e.g.
            # "Chanel") against Japanese product titles (e.g. "シャネル")
            # server-side. Our generic word-overlap similarity scorer can't
            # do that comparison, so it would incorrectly score every ALLU
            # result as 0 and filter everything out. Instead, trust ALLU's
            # own relevance ranking and label results as "similar" matches.
            for item in data.get("items", []):
                title = item.get("name") or ""
                item_id = item.get("id")
                if not title or item_id is None:
                    continue

                price = item.get("display_price_min")
                image = item.get("image") or {}

                results.append(
                    ProductResult(
                        title=title,
                        url=ITEM_URL_TEMPLATE.format(id=item_id),
                        store_id=self.store_id,
                        store_name=self.store_name,
                        similarity_score=0.6,
                        image_url=image.get("url"),
                        price=float(price) if price is not None else None,
                        currency="JPY",
                        similarity_reason="Resultado de la búsqueda en ALLU",
                    )
                )
        except Exception:
            pass

        return sorted(results, key=lambda r: r.similarity_score, reverse=True)
