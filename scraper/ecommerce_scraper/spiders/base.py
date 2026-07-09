import re

import scrapy


class BaseStoreSpider(scrapy.Spider):
    """
    Spider de base : reçoit la configuration du store concurrent (ligne de la
    table competitor_stores convertie en dict) et expose les helpers communs.
    """

    def __init__(self, store=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.store = store or {}
        if not self.store.get("url"):
            raise ValueError("Configuration du store invalide: URL manquante")
        self.start_urls = [self.store["url"]]
        selectors = self.store.get("css_selectors") or {}
        self.render_js = bool(selectors.get("render_js"))

    @staticmethod
    def parse_price(raw):
        """
        Extrait un prix décimal depuis du texte libre :
        "1 234,56 €" -> 1234.56 ; "$19.99" -> 19.99 ; "19,99" -> 19.99
        """
        if raw is None:
            return None
        text = str(raw)
        match = re.search(r"(\d[\d\s  .,]*)", text)
        if not match:
            return None

        number = re.sub(r"[\s  ]", "", match.group(1))
        # Si virgule ET point sont présents, le dernier des deux est le séparateur décimal
        if "," in number and "." in number:
            if number.rfind(",") > number.rfind("."):
                number = number.replace(".", "").replace(",", ".")
            else:
                number = number.replace(",", "")
        elif "," in number:
            # Une virgule suivie d'exactement 3 chiffres = séparateur de milliers
            if re.fullmatch(r"\d{1,3}(,\d{3})+", number):
                number = number.replace(",", "")
            else:
                number = number.replace(",", ".")

        try:
            return round(float(number), 2)
        except ValueError:
            return None

    def make_item(self, *, name, price, url, stock_status="unknown", raw=None):
        from ..items import ScrapedProductItem

        return ScrapedProductItem(
            store_id=self.store.get("id"),
            product_name=(name or "").strip(),
            price=price,
            stock_status=stock_status,
            url=url,
            raw_data=raw or {},
        )
