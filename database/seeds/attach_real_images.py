# -*- coding: utf-8 -*-
"""
Remplace les images des produits de démo par de vraies photos produit
professionnelles, libres de droits, via l'API Pexels (licence Pexels :
utilisation libre, attribution non requise — https://www.pexels.com/license/).

Les photos sont téléchargées puis ré-uploadées dans la plateforme : les
fichiers restent auto-hébergés (backend /uploads), la démo fonctionne donc
hors connexion une fois le script exécuté.

Prérequis :
  - backend démarré + boutique de démo peuplée (seed_demo_shop.py)
  - pip install requests
  - clé API gratuite : https://www.pexels.com/api/

Usage :
  PEXELS_API_KEY=xxxx python database/seeds/attach_real_images.py
  (ou : python attach_real_images.py --key xxxx)

Idempotent : chaque produit reçoit la première photo Pexels de sa requête
(déterministe tant que l'index Pexels ne change pas) ; relancer le script
remplace simplement l'image.
"""

import io
import os
import sys
import time

import requests

API = "http://localhost:5001/api"
PEXELS_SEARCH = "https://api.pexels.com/v1/search"

# Nom exact du produit -> (requête Pexels en anglais, index du résultat).
# L'index permet de choisir une autre photo si la première correspond mal.
QUERIES = {
    # TechPro — Électronique / Informatique
    "Casque Bluetooth ANC Pro": ("wireless headphones black", 0),
    "Enceinte nomade XSound": ("portable bluetooth speaker", 0),
    "Montre connectée Pulse 2": ("smartwatch wrist", 0),
    "Écouteurs sans fil AirGo": ("wireless earbuds case", 0),
    "Clavier mécanique RGB K70": ("mechanical keyboard rgb", 0),
    "Souris gamer Precision X": ("gaming mouse", 0),
    "Hub USB-C 8-en-1": ("usb hub adapter", 0),
    "Webcam StreamCam 2K": ("webcam", 2),
    "Chargeur GaN 65 W": ("usb wall charger", 0),
    "SSD portable 1 To": ("portable external ssd", 3),
    "Casque Audio Sans Fil": ("over ear headphones", 0),
    # Mode Urbaine — Mode & Accessoires
    "Sac à dos urbain 20 L": ("backpack product", 0),
    "Lunettes de soleil Aviator": ("aviator sunglasses", 0),
    "Montre minimaliste Oslo": ("minimalist watch leather strap", 0),
    "Ceinture cuir réversible": ("leather belt", 0),
    "Écharpe laine mérinos": ("wool scarf", 0),
    "Portefeuille RFID slim": ("leather wallet", 0),
    "Casquette baseball premium": ("baseball cap", 0),
    "Sneakers blanches Classic": ("white sneakers", 0),
    "Bonnet côtelé unisexe": ("knit beanie", 0),
    "Bracelet acier milanais": ("steel bracelet watch", 0),
    # Maison Déco — Maison & Déco
    "Lampe de table Halo": ("table lamp bedside", 0),
    "Vase céramique Terra": ("ceramic vase", 0),
    "Plaid gaufré coton bio": ("cozy blanket sofa", 0),
    "Cadre photo chêne (lot de 3)": ("wooden picture frames wall", 0),
    "Bougie parfumée Santal": ("scented candle", 0),
    "Miroir rond laiton 50 cm": ("round wall mirror", 0),
    "Tapis berbère 160×230": ("berber rug", 0),
    "Étagère murale flottante": ("floating wall shelf", 0),
    "Carafe + 2 verres soufflés": ("glass carafe water", 0),
    "Suspension rotin Nara": ("rattan pendant lamp", 0),
    # Sport Plus — Sport & Plein air
    "Tapis de yoga pro 6 mm": ("yoga mat", 0),
    "Haltères réglables 2×24 kg": ("dumbbells gym", 0),
    "Corde à sauter lestée": ("jump rope", 0),
    "Gourde isotherme 750 ml": ("stainless steel water bottle", 0),
    "Bandes de résistance (set 5)": ("resistance bands fitness", 0),
    "Sac de sport 45 L": ("gym duffel bag", 0),
    "Montre GPS Trail 50": ("sports watch outdoor", 0),
    "Tente 2 places UltraLight": ("camping tent mountain", 0),
    "Ballon de foot taille 5": ("soccer ball grass", 0),
    "Rouleau de massage Deep": ("foam roller", 2),
    # Belle Époque — Beauté & Bien-être
    "Sérum vitamine C 15 %": ("vitamin c serum dropper", 0),
    "Crème hydratante 72 h": ("moisturizer cream jar", 0),
    "Huile visage rose musquée": ("facial oil bottle", 0),
    "Coffret soins mains": ("hand cream tube", 0),
    "Brosse nettoyante visage": ("facial cleansing brush", 0),
    "Masque cheveux kératine": ("hair mask jar", 0),
    "Diffuseur d'huiles 300 ml": ("essential oil diffuser", 0),
    "Gua sha + rouleau quartz": ("gua sha rose quartz", 0),
    "Shampoing solide doux": ("solid shampoo bar", 0),
    "Palette regard nude": ("eyeshadow palette", 0),
}


def get_api_key():
    if "--key" in sys.argv:
        return sys.argv[sys.argv.index("--key") + 1]
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        print("Clé API manquante : PEXELS_API_KEY=xxxx ou --key xxxx")
        sys.exit(1)
    return key


def login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    r.raise_for_status()
    return r.json()["accessToken"]


def search_photo(pexels_key, query, index):
    """Renvoie (bytes, photographe) de la photo Pexels correspondante."""
    r = requests.get(
        PEXELS_SEARCH,
        params={"query": query, "per_page": index + 3, "orientation": "landscape"},
        headers={"Authorization": pexels_key},
        timeout=30,
    )
    r.raise_for_status()
    photos = r.json().get("photos", [])
    if len(photos) <= index:
        raise RuntimeError(f"aucun résultat Pexels pour '{query}'")
    photo = photos[index]
    img = requests.get(photo["src"]["large"], timeout=45)
    img.raise_for_status()
    return img.content, photo.get("photographer", "?")


def main():
    pexels_key = get_api_key()
    session = requests.Session()
    admin_token = login("admin@platform.com", "Admin123!")
    headers = {"Authorization": f"Bearer {admin_token}"}

    products = session.get(f"{API}/products?limit=100", timeout=15).json()["items"]
    print(f"{len(products)} produits au catalogue")

    done, skipped, failed = 0, 0, 0
    for product in products:
        mapping = QUERIES.get(product["name"])
        if not mapping:
            skipped += 1
            print(f"[skip] pas de requête pour : {product['name']}")
            continue

        query, index = mapping
        try:
            photo, author = search_photo(pexels_key, query, index)
        except Exception as exc:  # noqa: BLE001 — on continue avec les autres produits
            failed += 1
            print(f"[ÉCHEC] {product['name']} ({query}) : {exc}")
            continue

        # Supprime les anciennes images puis uploade la photo
        for old_url in product.get("images") or []:
            session.delete(
                f"{API}/products/{product['id']}/images",
                json={"url": old_url},
                headers=headers,
                timeout=15,
            )

        r = session.post(
            f"{API}/products/{product['id']}/images",
            files={"images": (f"{product['id']}.jpg", io.BytesIO(photo), "image/jpeg")},
            headers=headers,
            timeout=30,
        )
        if r.status_code != 201:
            failed += 1
            print(f"[ÉCHEC upload] {product['name']} -> {r.status_code} {r.text[:100]}")
            continue

        done += 1
        print(f"[ok] {product['name']} <- '{query}' (photo : {author}, {len(photo) // 1024} Ko)")
        # Respecte la limite Pexels (200 requêtes/heure) avec une marge large
        time.sleep(0.4)

    print(f"\nTerminé : {done} photos attachées, {skipped} ignorés, {failed} échecs.")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
