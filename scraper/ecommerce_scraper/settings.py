BOT_NAME = "ecommerce_scraper"

SPIDER_MODULES = ["ecommerce_scraper.spiders"]
NEWSPIDER_MODULE = "ecommerce_scraper.spiders"

# Scraping "poli" : respecte robots.txt, limite la charge sur les sites cibles.
ROBOTSTXT_OBEY = True
DOWNLOAD_DELAY = 1.0
RANDOMIZE_DOWNLOAD_DELAY = True
CONCURRENT_REQUESTS_PER_DOMAIN = 2

RETRY_ENABLED = True
RETRY_TIMES = 2
DOWNLOAD_TIMEOUT = 30

DOWNLOADER_MIDDLEWARES = {
    "ecommerce_scraper.middlewares.RandomUserAgentMiddleware": 400,
    "ecommerce_scraper.middlewares.RotatingProxyMiddleware": 410,
    "ecommerce_scraper.middlewares.SeleniumMiddleware": 543,
}

ITEM_PIPELINES = {
    "ecommerce_scraper.pipelines.PostgresPipeline": 300,
}

LOG_LEVEL = "INFO"

REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
FEED_EXPORT_ENCODING = "utf-8"
