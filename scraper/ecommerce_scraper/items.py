import scrapy


class ScrapedProductItem(scrapy.Item):
    store_id = scrapy.Field()
    product_name = scrapy.Field()
    price = scrapy.Field()
    stock_status = scrapy.Field()
    url = scrapy.Field()
    raw_data = scrapy.Field()
