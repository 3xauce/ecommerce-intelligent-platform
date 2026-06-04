import scrapy
from scrapy.http import Request
from fake_useragent import UserAgent
import logging

class BaseEcommerceSpider(scrapy.Spider):
    """Spider de base pour le scraping e-commerce"""
    
    custom_settings = {
        'DOWNLOAD_DELAY': 2,
        'RANDOMIZE_DOWNLOAD_DELAY': True,
        'CONCURRENT_REQUESTS': 1,
        'ROBOTSTXT_OBEY': True,
        'COOKIES_ENABLED': True,
    }

    def __init__(self, store_config=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.store_config = store_config or {}
        self.ua = UserAgent()

    def start_requests(self):
        url = self.store_config.get('url')
        if not url:
            raise ValueError('URL du store requis')
        yield Request(
            url=url,
            headers={'User-Agent': self.ua.random},
            callback=self.parse
        )

    def parse(self, response):
        """A implémenter par les sous-classes"""
        raise NotImplementedError

    def extract_price(self, response, selector):
        try:
            raw = response.css(selector).get('').strip()
            return float(''.join(c for c in raw if c.isdigit() or c == '.'))
        except Exception:
            logging.warning(f'Impossible dextraire le prix avec {selector}')
            return None
