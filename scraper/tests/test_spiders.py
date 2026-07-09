"""
Tests hors-ligne des spiders : les réponses HTTP sont des fixtures locales,
aucun réseau ni base de données n'est nécessaire.
"""

import json
import sys
from pathlib import Path

from scrapy.http import HtmlResponse, Request, TextResponse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ecommerce_scraper.spiders.base import BaseStoreSpider  # noqa: E402
from ecommerce_scraper.spiders.generic import GenericSpider  # noqa: E402
from ecommerce_scraper.spiders.shopify import ShopifySpider  # noqa: E402
from ecommerce_scraper.spiders.woocommerce import WooCommerceSpider  # noqa: E402

STORE = {"id": "store-1", "url": "https://boutique.example.com"}


def make_html_response(url, body):
    return HtmlResponse(url=url, body=body, encoding="utf-8", request=Request(url=url))


# ---------------------------------------------------------------- parse_price
class TestParsePrice:
    def test_prix_francais_avec_espace_et_virgule(self):
        assert BaseStoreSpider.parse_price("1 234,56 €") == 1234.56

    def test_prix_dollar_americain(self):
        assert BaseStoreSpider.parse_price("$19.99") == 19.99

    def test_virgule_decimale_simple(self):
        assert BaseStoreSpider.parse_price("19,99") == 19.99

    def test_separateur_milliers_americain(self):
        assert BaseStoreSpider.parse_price("1,299") == 1299.0

    def test_milliers_et_decimales_us(self):
        assert BaseStoreSpider.parse_price("1,299.50") == 1299.50

    def test_entier_simple(self):
        assert BaseStoreSpider.parse_price("45 €") == 45.0

    def test_texte_sans_prix(self):
        assert BaseStoreSpider.parse_price("Épuisé") is None

    def test_none(self):
        assert BaseStoreSpider.parse_price(None) is None


# --------------------------------------------------------------- WooCommerce
WOOCOMMERCE_HTML = b"""
<html><body><ul class="products">
  <li class="product type-product instock">
    <a class="woocommerce-LoopProduct-link" href="/produit/clavier-gamer/">
      <h2 class="woocommerce-loop-product__title">Clavier Gamer RGB</h2>
      <span class="price"><span class="woocommerce-Price-amount amount">
        <bdi>79,99&nbsp;<span class="woocommerce-Price-currencySymbol">&euro;</span></bdi>
      </span></span>
    </a>
  </li>
  <li class="product type-product outofstock">
    <a class="woocommerce-LoopProduct-link" href="/produit/souris-sans-fil/">
      <h2 class="woocommerce-loop-product__title">Souris Sans Fil</h2>
      <span class="price"><span class="woocommerce-Price-amount amount">
        <bdi>29,90&nbsp;&euro;</bdi>
      </span></span>
    </a>
  </li>
</ul>
<nav><a class="next page-numbers" href="/boutique/page/2/">Suivant</a></nav>
</body></html>
"""


class TestWooCommerceSpider:
    def setup_method(self):
        self.spider = WooCommerceSpider(store=dict(STORE, platform="woocommerce"))

    def test_extrait_les_produits_et_la_pagination(self):
        response = make_html_response("https://boutique.example.com/boutique/", WOOCOMMERCE_HTML)
        results = list(self.spider.parse(response))

        items = [r for r in results if not isinstance(r, Request)]
        requests = [r for r in results if isinstance(r, Request)]

        assert len(items) == 2
        assert items[0]["product_name"] == "Clavier Gamer RGB"
        assert items[0]["price"] == 79.99
        assert items[0]["stock_status"] == "in_stock"
        assert items[0]["url"] == "https://boutique.example.com/produit/clavier-gamer/"
        assert items[0]["store_id"] == "store-1"

        assert items[1]["product_name"] == "Souris Sans Fil"
        assert items[1]["price"] == 29.90
        assert items[1]["stock_status"] == "out_of_stock"

        assert len(requests) == 1
        assert requests[0].url.endswith("/boutique/page/2/")


# ------------------------------------------------------------------- Shopify
SHOPIFY_JSON = {
    "products": [
        {
            "id": 111,
            "title": "T-shirt Premium",
            "handle": "t-shirt-premium",
            "vendor": "MarqueX",
            "product_type": "Vêtements",
            "tags": ["coton"],
            "variants": [
                {"price": "24.90", "available": True},
                {"price": "22.50", "available": False},
            ],
        },
        {
            "id": 222,
            "title": "Casquette",
            "handle": "casquette",
            "vendor": "MarqueX",
            "product_type": "Accessoires",
            "tags": [],
            "variants": [{"price": "15.00", "available": False}],
        },
    ]
}


class TestShopifySpider:
    def setup_method(self):
        self.spider = ShopifySpider(store=dict(STORE, platform="shopify"))

    def test_extrait_les_produits_du_json(self):
        url = "https://boutique.example.com/products.json?limit=250&page=1"
        response = TextResponse(
            url=url,
            body=json.dumps(SHOPIFY_JSON).encode(),
            encoding="utf-8",
            request=Request(url=url),
        )
        results = list(self.spider.parse(response, page=1, base="https://boutique.example.com"))
        items = [r for r in results if not isinstance(r, Request)]

        assert len(items) == 2
        assert items[0]["product_name"] == "T-shirt Premium"
        assert items[0]["price"] == 22.50  # le moins cher des variants
        assert items[0]["stock_status"] == "in_stock"  # au moins un variant dispo
        assert items[0]["url"] == "https://boutique.example.com/products/t-shirt-premium"

        assert items[1]["stock_status"] == "out_of_stock"

    def test_pas_de_pagination_sous_250_produits(self):
        url = "https://boutique.example.com/products.json?limit=250&page=1"
        response = TextResponse(
            url=url,
            body=json.dumps(SHOPIFY_JSON).encode(),
            encoding="utf-8",
            request=Request(url=url),
        )
        results = list(self.spider.parse(response, page=1, base="https://boutique.example.com"))
        requests = [r for r in results if isinstance(r, Request)]
        assert requests == []


# ------------------------------------------------------------------- Generic
GENERIC_HTML = b"""
<html><body><div id="catalogue">
  <article class="carte-produit">
    <h3 class="nom">Aspirateur Turbo</h3>
    <div class="prix">199,00 &euro;</div>
    <a class="lien" href="/p/aspirateur-turbo">Voir</a>
  </article>
  <article class="carte-produit">
    <h3 class="nom">Bouilloire Inox</h3>
    <div class="prix">34,50 &euro;</div>
    <a class="lien" href="/p/bouilloire-inox">Voir</a>
  </article>
</div></body></html>
"""


class TestGenericSpider:
    def setup_method(self):
        self.spider = GenericSpider(
            store=dict(
                STORE,
                platform="generic",
                css_selectors={
                    "product": "article.carte-produit",
                    "name": ".nom",
                    "price": ".prix",
                    "link": "a.lien",
                },
            )
        )

    def test_extrait_avec_selecteurs_personnalises(self):
        response = make_html_response("https://boutique.example.com/catalogue", GENERIC_HTML)
        items = [r for r in self.spider.parse(response) if not isinstance(r, Request)]

        assert len(items) == 2
        assert items[0]["product_name"] == "Aspirateur Turbo"
        assert items[0]["price"] == 199.0
        assert items[0]["url"] == "https://boutique.example.com/p/aspirateur-turbo"
        assert items[1]["product_name"] == "Bouilloire Inox"
        assert items[1]["price"] == 34.50

    def test_selecteurs_manquants_leve_une_erreur(self):
        import pytest

        with pytest.raises(ValueError):
            GenericSpider(store=dict(STORE, platform="generic", css_selectors={"product": ".x"}))
