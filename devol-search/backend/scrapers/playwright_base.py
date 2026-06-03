from typing import Optional

from playwright.async_api import async_playwright

from .base import BaseScraper, ProductResult

PRODUCT_SELECTORS = [
    ".product-item",
    ".product-card",
    "[data-product]",
    ".item",
    "li.product",
    ".product",
    "article",
]

TITLE_SELECTORS = ["h2", "h3", ".product-title", ".product-name", ".item-title", "h4"]
PRICE_SELECTORS = [".price", ".product-price", ".item-price", "[class*='price']"]


class PlaywrightScraper(BaseScraper):
    async def search(self, query: str, filters: dict) -> list[ProductResult]:
        results: list[ProductResult] = []
        browser = None
        try:
            encoded = query.replace(" ", "+")
            search_url = self.search_url_template.format(query=encoded)

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.goto(search_url, timeout=30000, wait_until="domcontentloaded")
                await page.wait_for_timeout(2000)

                cards = []
                for selector in PRODUCT_SELECTORS:
                    try:
                        elements = await page.query_selector_all(selector)
                        if elements:
                            cards = elements
                            break
                    except Exception:
                        continue

                for card in cards[:50]:
                    try:
                        title = await self._extract_text(card, TITLE_SELECTORS)
                        if not title:
                            continue

                        price = await self._extract_price(card)
                        image_url = await self._extract_image(card)
                        link = await self._extract_link(card)

                        if not link:
                            continue
                        if not link.startswith("http"):
                            link = self.store_url.rstrip("/") + "/" + link.lstrip("/")

                        score, reason = self._calculate_similarity(query, title)
                        if score >= 0.4:
                            results.append(
                                ProductResult(
                                    title=title,
                                    url=link,
                                    store_id=self.store_id,
                                    store_name=self.store_name,
                                    similarity_score=score,
                                    image_url=image_url,
                                    price=price,
                                    currency="JPY",
                                    similarity_reason=reason,
                                )
                            )
                    except Exception:
                        continue

        except Exception:
            pass
        finally:
            if browser:
                try:
                    await browser.close()
                except Exception:
                    pass

        return sorted(results, key=lambda r: r.similarity_score, reverse=True)

    async def _extract_text(self, element, selectors: list[str]) -> str:
        for sel in selectors:
            try:
                el = await element.query_selector(sel)
                if el:
                    text = await el.inner_text()
                    if text and text.strip():
                        return text.strip()
            except Exception:
                continue
        try:
            text = await element.inner_text()
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            return lines[0] if lines else ""
        except Exception:
            return ""

    async def _extract_price(self, element) -> Optional[float]:
        for sel in PRICE_SELECTORS:
            try:
                el = await element.query_selector(sel)
                if el:
                    text = await el.inner_text()
                    cleaned = "".join(c for c in text if c.isdigit() or c == ".")
                    if cleaned:
                        return float(cleaned)
            except Exception:
                continue
        return None

    async def _extract_image(self, element) -> Optional[str]:
        try:
            img = await element.query_selector("img")
            if img:
                src = await img.get_attribute("src")
                if src:
                    return src if src.startswith("http") else f"https:{src}"
                src = await img.get_attribute("data-src")
                if src:
                    return src if src.startswith("http") else f"https:{src}"
        except Exception:
            pass
        return None

    async def _extract_link(self, element) -> Optional[str]:
        try:
            a = await element.query_selector("a")
            if a:
                return await a.get_attribute("href")
        except Exception:
            pass
        return None
