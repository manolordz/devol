import httpx

from .base import BaseScraper, ProductResult


class ShopifyScraper(BaseScraper):
    async def search(self, query: str, filters: dict) -> list[ProductResult]:
        results: list[ProductResult] = []
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                products = await self._fetch_all_products(client)
                if not products and self.search_url_template:
                    products = await self._fetch_search_products(client, query)

            for product in products:
                title = product.get("title", "")
                handle = product.get("handle", "")
                variants = product.get("variants", [])
                images = product.get("images", [])

                price = None
                if variants:
                    try:
                        price = float(variants[0].get("price", 0))
                    except (ValueError, TypeError):
                        pass

                image_url = None
                if images:
                    image_url = images[0].get("src")

                product_url = f"{self.store_url}/products/{handle}" if handle else ""

                score, reason = self._calculate_similarity(query, title)
                if score >= 0.4:
                    results.append(
                        ProductResult(
                            title=title,
                            url=product_url,
                            store_id=self.store_id,
                            store_name=self.store_name,
                            similarity_score=score,
                            image_url=image_url,
                            price=price,
                            currency="JPY",
                            similarity_reason=reason,
                        )
                    )
        except Exception as e:
            pass

        return sorted(results, key=lambda r: r.similarity_score, reverse=True)

    async def _fetch_all_products(self, client: httpx.AsyncClient) -> list[dict]:
        try:
            url = f"{self.store_url}/products.json?limit=250"
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("products", [])
        except Exception:
            pass
        return []

    async def _fetch_search_products(self, client: httpx.AsyncClient, query: str) -> list[dict]:
        try:
            encoded = query.replace(" ", "+")
            url = f"{self.store_url}/search?q={encoded}&type=product&view=json"
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, dict):
                    return data.get("products", [])
        except Exception:
            pass
        return []
