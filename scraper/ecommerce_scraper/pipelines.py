import json
import logging

from .db import get_connection

logger = logging.getLogger(__name__)


class PostgresPipeline:
    """
    Écrit chaque produit scrapé dans la table scraped_products, puis met à
    jour competitor_stores.last_scraped_at à la fermeture du spider.
    """

    def open_spider(self, spider):
        self.conn = get_connection()
        self.items_count = 0

    def process_item(self, item, spider):
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO scraped_products
                    (store_id, product_name, price, stock_status, url, raw_data)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    item.get("store_id"),
                    (item.get("product_name") or "")[:255],
                    item.get("price"),
                    item.get("stock_status"),
                    (item.get("url") or "")[:500],
                    json.dumps(item.get("raw_data") or {}),
                ),
            )
        self.conn.commit()
        self.items_count += 1
        return item

    def close_spider(self, spider):
        store_id = getattr(spider, "store", {}).get("id")
        if store_id:
            with self.conn.cursor() as cur:
                cur.execute(
                    "UPDATE competitor_stores SET last_scraped_at = NOW() WHERE id = %s",
                    (store_id,),
                )
            self.conn.commit()
        logger.info("Scraping terminé: %s produit(s) enregistré(s)", self.items_count)
        self.conn.close()
