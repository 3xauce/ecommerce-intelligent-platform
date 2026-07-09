"""
Exécute le scraping d'un store concurrent : python run_spider.py <store_id>

Charge la configuration du store depuis PostgreSQL, choisit le spider adapté
à la plateforme, et écrit les produits scrapés dans scraped_products.
"""

import sys

from dotenv import load_dotenv

load_dotenv()

from scrapy.crawler import CrawlerProcess  # noqa: E402
from scrapy.utils.project import get_project_settings  # noqa: E402

from ecommerce_scraper.db import fetch_store  # noqa: E402
from ecommerce_scraper.spiders.generic import GenericSpider  # noqa: E402
from ecommerce_scraper.spiders.shopify import ShopifySpider  # noqa: E402
from ecommerce_scraper.spiders.woocommerce import WooCommerceSpider  # noqa: E402

SPIDERS = {
    "woocommerce": WooCommerceSpider,
    "shopify": ShopifySpider,
    "generic": GenericSpider,
}


def main():
    if len(sys.argv) != 2:
        print("Usage: python run_spider.py <store_id>", file=sys.stderr)
        sys.exit(2)

    store_id = sys.argv[1]
    store = fetch_store(store_id)
    if store is None:
        print(f"Store introuvable: {store_id}", file=sys.stderr)
        sys.exit(1)

    spider_cls = SPIDERS.get(store.get("platform"))
    if spider_cls is None:
        print(f"Plateforme non supportée: {store.get('platform')}", file=sys.stderr)
        sys.exit(1)

    # Les UUID/dates psycopg2 doivent être sérialisables pour le spider
    store["id"] = str(store["id"])

    process = CrawlerProcess(get_project_settings())
    process.crawl(spider_cls, store=store)
    process.start()


if __name__ == "__main__":
    main()
