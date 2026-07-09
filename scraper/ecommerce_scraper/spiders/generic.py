from .base import BaseStoreSpider


class GenericSpider(BaseStoreSpider):
    """
    Spider paramétrable par sélecteurs CSS (colonne css_selectors du store) :
      { "product": "li.item", "name": ".title", "price": ".price",
        "link": "a", "next_page": "a.next", "render_js": false }
    Permet de surveiller n'importe quelle plateforme non standard.
    render_js=true active le rendu Selenium (pages construites en JavaScript).
    """

    name = "generic"

    def __init__(self, store=None, *args, **kwargs):
        super().__init__(store=store, *args, **kwargs)
        self.selectors = self.store.get("css_selectors") or {}
        for required in ("product", "name", "price"):
            if not self.selectors.get(required):
                raise ValueError(f"Sélecteur CSS requis manquant: {required}")

    def parse(self, response):
        for product in response.css(self.selectors["product"]):
            name = " ".join(product.css(f"{self.selectors['name']} ::text").getall()).strip() or (
                product.css(f"{self.selectors['name']}::text").get() or ""
            ).strip()
            if not name:
                continue

            price_text = " ".join(product.css(f"{self.selectors['price']} ::text").getall())
            if not price_text.strip():
                price_text = product.css(f"{self.selectors['price']}::text").get() or ""

            link = None
            if self.selectors.get("link"):
                link = product.css(f"{self.selectors['link']}::attr(href)").get()

            yield self.make_item(
                name=name,
                price=self.parse_price(price_text),
                url=response.urljoin(link) if link else response.url,
                stock_status="unknown",
                raw={"price_text": price_text.strip()},
            )

        if self.selectors.get("next_page"):
            next_page = response.css(f"{self.selectors['next_page']}::attr(href)").get()
            if next_page:
                yield response.follow(next_page, callback=self.parse)
