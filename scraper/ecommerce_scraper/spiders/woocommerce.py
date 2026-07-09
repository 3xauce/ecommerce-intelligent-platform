from .base import BaseStoreSpider


class WooCommerceSpider(BaseStoreSpider):
    """
    Spider pour les boutiques WooCommerce : s'appuie sur le balisage standard
    du thème Storefront (li.product, .woocommerce-loop-product__title, .price).
    """

    name = "woocommerce"

    def parse(self, response):
        for product in response.css("li.product"):
            name = (
                product.css(".woocommerce-loop-product__title::text").get()
                or product.css("h2::text").get()
                or product.css("h3::text").get()
            )
            if not name:
                continue

            price_text = " ".join(product.css(".price ::text").getall())
            link = product.css("a.woocommerce-LoopProduct-link::attr(href)").get() or product.css(
                "a::attr(href)"
            ).get()

            css_classes = product.attrib.get("class", "")
            stock_status = "out_of_stock" if "outofstock" in css_classes else "in_stock"

            yield self.make_item(
                name=name,
                price=self.parse_price(price_text),
                url=response.urljoin(link) if link else response.url,
                stock_status=stock_status,
                raw={"price_text": price_text.strip(), "classes": css_classes},
            )

        next_page = response.css("a.next.page-numbers::attr(href)").get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)
