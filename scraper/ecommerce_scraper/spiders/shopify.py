import json

import scrapy

from .base import BaseStoreSpider


class ShopifySpider(BaseStoreSpider):
    """
    Spider pour les boutiques Shopify : utilise l'endpoint public
    /products.json (exposé par toutes les boutiques Shopify), plus fiable
    que le parsing HTML et insensible au thème.
    """

    name = "shopify"
    PAGE_SIZE = 250

    def start_requests(self):
        base = self.store["url"].rstrip("/")
        yield scrapy.Request(
            f"{base}/products.json?limit={self.PAGE_SIZE}&page=1",
            callback=self.parse,
            cb_kwargs={"page": 1, "base": base},
        )

    def parse(self, response, page, base):
        try:
            products = json.loads(response.text).get("products", [])
        except json.JSONDecodeError:
            self.logger.error("Réponse non-JSON de %s", response.url)
            return

        for product in products:
            variants = product.get("variants") or []
            prices = [self.parse_price(v.get("price")) for v in variants]
            prices = [p for p in prices if p is not None]
            available = any(v.get("available") for v in variants)

            yield self.make_item(
                name=product.get("title"),
                price=min(prices) if prices else None,
                url=f"{base}/products/{product.get('handle')}",
                stock_status="in_stock" if available else "out_of_stock",
                raw={
                    "id": product.get("id"),
                    "vendor": product.get("vendor"),
                    "product_type": product.get("product_type"),
                    "variants_count": len(variants),
                    "tags": product.get("tags"),
                },
            )

        if len(products) == self.PAGE_SIZE:
            next_page = page + 1
            yield scrapy.Request(
                f"{base}/products.json?limit={self.PAGE_SIZE}&page={next_page}",
                callback=self.parse,
                cb_kwargs={"page": next_page, "base": base},
            )
