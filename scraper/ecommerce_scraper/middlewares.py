import logging
import os
import random

logger = logging.getLogger(__name__)

# UA statiques de secours si fake-useragent ne peut pas rafraîchir sa base
FALLBACK_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
]


class RandomUserAgentMiddleware:
    """Rotation de user-agents pour limiter la détection du scraping."""

    def __init__(self):
        self._ua = None
        try:
            from fake_useragent import UserAgent

            self._ua = UserAgent(fallback=FALLBACK_USER_AGENTS[0])
        except Exception:  # pragma: no cover - dépend du réseau
            logger.warning("fake-useragent indisponible, utilisation des UA de secours")

    def get_user_agent(self):
        if self._ua is not None:
            try:
                return self._ua.random
            except Exception:  # pragma: no cover
                pass
        return random.choice(FALLBACK_USER_AGENTS)

    def process_request(self, request, spider):
        request.headers["User-Agent"] = self.get_user_agent()
        return None


class RotatingProxyMiddleware:
    """
    Rotation de proxies : PROXY_LIST est une liste d'URLs séparées par des
    virgules (http://user:pass@host:port). No-op si la variable est vide.
    """

    def __init__(self):
        raw = os.environ.get("PROXY_LIST", "")
        self.proxies = [p.strip() for p in raw.split(",") if p.strip()]

    def process_request(self, request, spider):
        if self.proxies:
            request.meta["proxy"] = random.choice(self.proxies)
        return None


class SeleniumMiddleware:
    """
    Rendu JavaScript via Selenium (Chrome headless) pour les stores dont la
    configuration contient render_js=true. Les autres requêtes passent par le
    téléchargeur Scrapy classique.
    """

    def __init__(self):
        self._driver = None

    def _get_driver(self):
        if self._driver is None:
            from selenium import webdriver
            from selenium.webdriver.chrome.options import Options

            options = Options()
            options.add_argument("--headless=new")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--disable-gpu")
            self._driver = webdriver.Chrome(options=options)
            self._driver.set_page_load_timeout(30)
        return self._driver

    def process_request(self, request, spider):
        if not getattr(spider, "render_js", False):
            return None

        from scrapy.http import HtmlResponse

        driver = self._get_driver()
        driver.get(request.url)
        return HtmlResponse(
            url=request.url,
            body=driver.page_source,
            encoding="utf-8",
            request=request,
        )

    def spider_closed(self, spider):  # pragma: no cover - nettoyage
        if self._driver is not None:
            self._driver.quit()
            self._driver = None
