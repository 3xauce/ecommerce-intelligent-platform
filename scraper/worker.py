"""
Worker de scraping : consomme la file Redis "scraping:jobs" alimentée par le
backend (POST /api/scraping/run/:storeId ou planification SCRAPING_CRON) et
exécute chaque job dans un sous-processus Scrapy isolé.

Lancement : python worker.py
"""

import json
import logging
import os
import subprocess
import sys

import redis
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("scraping-worker")

QUEUE_NAME = "scraping:jobs"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def process_job(payload):
    try:
        job = json.loads(payload)
    except json.JSONDecodeError:
        logger.error("Job illisible, ignoré: %r", payload)
        return

    store_id = job.get("store_id")
    if not store_id:
        logger.error("Job sans store_id, ignoré: %r", job)
        return

    logger.info("Traitement du job store_id=%s", store_id)
    result = subprocess.run(
        [sys.executable, os.path.join(SCRIPT_DIR, "run_spider.py"), str(store_id)],
        cwd=SCRIPT_DIR,
        capture_output=True,
        text=True,
        timeout=600,
    )

    if result.returncode == 0:
        logger.info("Job store_id=%s terminé avec succès", store_id)
    else:
        logger.error(
            "Job store_id=%s en échec (code %s)\n%s",
            store_id,
            result.returncode,
            result.stderr[-2000:],
        )


def main():
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    # socket_timeout doit rester supérieur au timeout du BRPOP, sinon le
    # client lève TimeoutError à chaque attente vide de la file.
    client = redis.Redis.from_url(redis_url, socket_timeout=10)
    client.ping()
    logger.info("Worker démarré — en attente de jobs sur %r (%s)", QUEUE_NAME, redis_url)

    while True:
        try:
            result = client.brpop(QUEUE_NAME, timeout=5)
            if result is None:
                continue
            _, payload = result
            process_job(payload.decode("utf-8"))
        except KeyboardInterrupt:
            logger.info("Arrêt du worker demandé")
            break
        except (redis.exceptions.TimeoutError, TimeoutError):
            # Attente vide de la file : on repart simplement sur un BRPOP.
            continue
        except redis.exceptions.ConnectionError as exc:
            logger.error("Connexion Redis perdue (%s), nouvelle tentative...", exc)
            import time

            time.sleep(5)


if __name__ == "__main__":
    main()
