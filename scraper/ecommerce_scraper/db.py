import os

import psycopg2
import psycopg2.extras


def get_connection():
    """Connexion PostgreSQL depuis DATABASE_URL (même variable que le backend)."""
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL manquant dans l'environnement")
    return psycopg2.connect(dsn)


def fetch_store(store_id):
    """Charge la configuration d'un store concurrent, sous forme de dict."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM competitor_stores WHERE id = %s", (store_id,))
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()
