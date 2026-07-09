FROM python:3.12-slim

WORKDIR /app

# Pour activer le rendu JavaScript (render_js=true, via Selenium),
# décommenter l'installation de Chromium ci-dessous (ajoute ~400 Mo) :
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     chromium chromium-driver \
#     && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY scrapy.cfg run_spider.py worker.py ./
COPY ecommerce_scraper ./ecommerce_scraper

CMD ["python", "worker.py"]
