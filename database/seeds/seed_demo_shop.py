# -*- coding: utf-8 -*-
"""
Peuplement de démo de la boutique via l'API réelle (idempotent).

Prérequis :
  - backend démarré (docker compose up -d) et comptes seedés
    (docker compose exec backend node src/database/seed.js)
  - pip install pillow requests

Usage : python database/seeds/seed_demo_shop.py

Comptes vendeurs créés (mot de passe commun : Vendeur123!) :
  techpro / modeurbaine / maisondeco / sportplus / belleepoque @novacart.com

Détail :
6 catégories (admin), 5 vendeurs, 10 produits chacun, 1 image générée
(Pillow) et uploadée par produit.
"""

import io
import random
import sys

import requests
from PIL import Image, ImageDraw, ImageFont

API = "http://localhost:5001/api"
random.seed(42)

# ---------------------------------------------------------------- Données ---
CATEGORIES = [
    "Électronique",
    "Informatique",
    "Mode & Accessoires",
    "Maison & Déco",
    "Sport & Plein air",
    "Beauté & Bien-être",
]

# (nom, prénom, email, thème boutique) — mot de passe commun de démo
VENDORS = [
    ("Karim", "Haddad", "techpro@novacart.com", "TechPro"),
    ("Sofia", "Martins", "modeurbaine@novacart.com", "Mode Urbaine"),
    ("Léa", "Fontaine", "maisondeco@novacart.com", "Maison Déco"),
    ("Yanis", "Berrada", "sportplus@novacart.com", "Sport Plus"),
    ("Nora", "Lambert", "belleepoque@novacart.com", "Belle Époque"),
]
PASSWORD = "Vendeur123!"

# Par vendeur : (nom, description, prix, stock, catégorie, palette)
PALETTES = {
    "Électronique": ((79, 70, 229), (139, 92, 246)),
    "Informatique": ((14, 165, 233), (79, 70, 229)),
    "Mode & Accessoires": ((236, 72, 153), (139, 92, 246)),
    "Maison & Déco": ((245, 158, 11), (234, 88, 12)),
    "Sport & Plein air": ((16, 185, 129), (14, 165, 233)),
    "Beauté & Bien-être": ((244, 63, 94), (236, 72, 153)),
}

PRODUCTS = {
    "techpro@novacart.com": [
        ("Casque Bluetooth ANC Pro", "Réduction de bruit active, 35 h d'autonomie, Bluetooth 5.3", 129.99, 34, "Électronique"),
        ("Enceinte nomade XSound", "Étanche IPX7, 24 h d'autonomie, basses renforcées", 79.90, 52, "Électronique"),
        ("Montre connectée Pulse 2", "GPS, cardio, SpO2, écran AMOLED 1,4 pouces", 149.00, 27, "Électronique"),
        ("Écouteurs sans fil AirGo", "Intra-auriculaires, boîtier de charge, 28 h au total", 59.90, 88, "Électronique"),
        ("Clavier mécanique RGB K70", "Switches rouges, rétroéclairage par touche, USB-C", 94.50, 19, "Informatique"),
        ("Souris gamer Precision X", "Capteur 26 000 DPI, 8 boutons programmables, 63 g", 49.90, 45, "Informatique"),
        ("Hub USB-C 8-en-1", "HDMI 4K, 3 × USB 3.0, lecteur SD, charge 100 W", 39.99, 73, "Informatique"),
        ("Webcam StreamCam 2K", "Capteur 2K 30 ips, micro stéréo, correction de lumière", 69.00, 31, "Informatique"),
        ("Chargeur GaN 65 W", "2 × USB-C + USB-A, compact, compatible laptop", 34.90, 120, "Électronique"),
        ("SSD portable 1 To", "USB-C 3.2, 1050 Mo/s, résistant aux chocs", 99.00, 40, "Informatique"),
    ],
    "modeurbaine@novacart.com": [
        ("Sac à dos urbain 20 L", "Toile déperlante, poche laptop 15 pouces, port USB", 54.90, 42, "Mode & Accessoires"),
        ("Lunettes de soleil Aviator", "Verres polarisés UV400, monture métal doré", 39.00, 65, "Mode & Accessoires"),
        ("Montre minimaliste Oslo", "Cadran 38 mm, bracelet cuir italien, mouvement quartz", 89.00, 23, "Mode & Accessoires"),
        ("Ceinture cuir réversible", "Cuir pleine fleur noir/marron, boucle pivotante", 29.90, 90, "Mode & Accessoires"),
        ("Écharpe laine mérinos", "100 % mérinos, tissage doux, 180 × 30 cm", 45.00, 38, "Mode & Accessoires"),
        ("Portefeuille RFID slim", "Cuir végétal, blocage RFID, 8 cartes", 24.90, 110, "Mode & Accessoires"),
        ("Casquette baseball premium", "Coton bio brossé, broderie ton sur ton", 19.90, 140, "Mode & Accessoires"),
        ("Sneakers blanches Classic", "Cuir grainé, semelle cousue, made in Portugal", 119.00, 33, "Mode & Accessoires"),
        ("Bonnet côtelé unisexe", "Maille recyclée, doublure polaire", 17.50, 95, "Mode & Accessoires"),
        ("Bracelet acier milanais", "Maille milanaise 20 mm, fermoir aimanté", 22.00, 77, "Mode & Accessoires"),
    ],
    "maisondeco@novacart.com": [
        ("Lampe de table Halo", "Abat-jour lin, variateur tactile 3 intensités", 64.90, 28, "Maison & Déco"),
        ("Vase céramique Terra", "Fait main, émail réactif, 25 cm", 42.00, 35, "Maison & Déco"),
        ("Plaid gaufré coton bio", "130 × 170 cm, teinture végétale, ocre", 49.90, 44, "Maison & Déco"),
        ("Cadre photo chêne (lot de 3)", "Chêne massif, formats 10×15, 13×18, 20×25", 34.50, 58, "Maison & Déco"),
        ("Bougie parfumée Santal", "Cire de soja, 45 h de combustion, pot réutilisable", 26.00, 96, "Maison & Déco"),
        ("Miroir rond laiton 50 cm", "Cadre laiton brossé, fixation invisible", 89.00, 17, "Maison & Déco"),
        ("Tapis berbère 160×230", "Laine nouée main, motifs losanges", 249.00, 9, "Maison & Déco"),
        ("Étagère murale flottante", "Noyer massif, fixations invisibles, 80 cm", 39.90, 61, "Maison & Déco"),
        ("Carafe + 2 verres soufflés", "Verre borosilicate soufflé bouche", 36.00, 47, "Maison & Déco"),
        ("Suspension rotin Nara", "Rotin tressé main, douille E27, Ø 40 cm", 74.90, 21, "Maison & Déco"),
    ],
    "sportplus@novacart.com": [
        ("Tapis de yoga pro 6 mm", "Caoutchouc naturel, antidérapant, sangle incluse", 59.00, 54, "Sport & Plein air"),
        ("Haltères réglables 2×24 kg", "Réglage rapide 2,5 à 24 kg, support inclus", 299.00, 12, "Sport & Plein air"),
        ("Corde à sauter lestée", "Roulements à billes, poignées alu, câble acier", 24.90, 87, "Sport & Plein air"),
        ("Gourde isotherme 750 ml", "Inox double paroi, 24 h froid / 12 h chaud", 27.50, 132, "Sport & Plein air"),
        ("Bandes de résistance (set 5)", "Latex naturel, 5 niveaux, sac de transport", 19.90, 145, "Sport & Plein air"),
        ("Sac de sport 45 L", "Compartiment chaussures, poche humide, bandoulière", 44.90, 39, "Sport & Plein air"),
        ("Montre GPS Trail 50", "Cartographie, altimètre, 30 h en mode GPS", 199.00, 18, "Sport & Plein air"),
        ("Tente 2 places UltraLight", "1,8 kg, montage 5 min, imperméable 3000 mm", 159.00, 14, "Sport & Plein air"),
        ("Ballon de foot taille 5", "Cousu machine, certifié FIFA Basic", 29.90, 76, "Sport & Plein air"),
        ("Rouleau de massage Deep", "Mousse EPP haute densité, 33 cm", 22.90, 68, "Sport & Plein air"),
    ],
    "belleepoque@novacart.com": [
        ("Sérum vitamine C 15 %", "Éclat et anti-taches, 30 ml, vegan", 32.00, 84, "Beauté & Bien-être"),
        ("Crème hydratante 72 h", "Acide hyaluronique + céramides, 50 ml", 27.90, 102, "Beauté & Bien-être"),
        ("Huile visage rose musquée", "Pressée à froid, bio, 30 ml", 24.50, 66, "Beauté & Bien-être"),
        ("Coffret soins mains", "Crème + baume + gommage, karité bio", 29.00, 49, "Beauté & Bien-être"),
        ("Brosse nettoyante visage", "Silicone médical, 5 modes, étanche IPX7", 39.90, 37, "Beauté & Bien-être"),
        ("Masque cheveux kératine", "Réparation intense, 250 ml, sans sulfates", 21.00, 91, "Beauté & Bien-être"),
        ("Diffuseur d'huiles 300 ml", "Ultrasonique, 7 couleurs, arrêt auto", 34.90, 43, "Beauté & Bien-être"),
        ("Gua sha + rouleau quartz", "Quartz rose véritable, pochette lin", 19.90, 118, "Beauté & Bien-être"),
        ("Shampoing solide doux", "Camomille bio, 75 g, équivaut 2 flacons", 12.50, 156, "Beauté & Bien-être"),
        ("Palette regard nude", "12 teintes mates et irisées, talc-free", 26.90, 59, "Beauté & Bien-être"),
    ],
}


# ------------------------------------------------------- Génération image ---
def load_font(size, bold=False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)
    except OSError:
        return ImageFont.load_default()


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make_image(name, brand, palette):
    w, h = 800, 600
    c1, c2 = palette
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img, "RGBA")

    # Dégradé diagonal
    for y in range(h):
        draw.line([(0, y), (w, y)], fill=lerp(c1, c2, y / h))

    # Cercles décoratifs translucides
    draw.ellipse([w - 320, -160, w + 120, 280], fill=(255, 255, 255, 26))
    draw.ellipse([-140, h - 260, 220, h + 100], fill=(255, 255, 255, 20))
    draw.ellipse([w - 210, h - 190, w - 30, h - 10], outline=(255, 255, 255, 60), width=3)

    # Nom du produit (retour à la ligne manuel)
    font_big = load_font(52, bold=True)
    words, lines, line = name.split(), [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if draw.textlength(candidate, font=font_big) > w - 120:
            lines.append(line)
            line = word
        else:
            line = candidate
    lines.append(line)

    y = h // 2 - len(lines) * 32
    for text_line in lines:
        draw.text((60, y), text_line, font=font_big, fill=(255, 255, 255, 255))
        y += 64

    # Marque du vendeur
    draw.text((60, h - 80), brand.upper(), font=load_font(26, bold=True), fill=(255, 255, 255, 200))

    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=88)
    buffer.seek(0)
    return buffer


# ------------------------------------------------------------------- API ---
def login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    r.raise_for_status()
    return r.json()["accessToken"]


def main():
    session = requests.Session()

    # 1. Catégories (admin) — idempotent : ignore les doublons (409)
    admin_token = login("admin@platform.com", "Admin123!")
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    categories = {}
    existing = session.get(f"{API}/categories", timeout=15).json()
    for cat in existing:
        categories[cat["name"]] = cat["id"]
    for name in CATEGORIES:
        if name in categories:
            print(f"[cat] existe déjà : {name}")
            continue
        r = session.post(f"{API}/categories", json={"name": name}, headers=headers_admin, timeout=15)
        if r.status_code == 201:
            categories[name] = r.json()["id"]
            print(f"[cat] créée : {name}")
        else:
            print(f"[cat] ERREUR {r.status_code} : {name} -> {r.text[:100]}")
            sys.exit(1)

    # 2. Vendeurs + produits + images
    total_products = 0
    for first, last, email, brand in VENDORS:
        r = session.post(
            f"{API}/auth/register",
            json={"email": email, "password": PASSWORD, "first_name": first, "last_name": last, "role": "vendeur"},
            timeout=15,
        )
        if r.status_code == 201:
            token = r.json()["accessToken"]
            print(f"[vendeur] créé : {brand} ({email})")
        elif r.status_code == 409:
            token = login(email, PASSWORD)
            print(f"[vendeur] existe déjà : {brand}")
        else:
            print(f"[vendeur] ERREUR {r.status_code} : {email} -> {r.text[:100]}")
            sys.exit(1)

        headers = {"Authorization": f"Bearer {token}"}
        for name, description, price, stock, cat_name, in PRODUCTS[email]:
            r = session.post(
                f"{API}/products",
                json={
                    "name": name,
                    "description": description,
                    "price": price,
                    "stock": stock,
                    "category_id": categories[cat_name],
                },
                headers=headers,
                timeout=15,
            )
            if r.status_code != 201:
                print(f"  [produit] ERREUR {r.status_code} : {name} -> {r.text[:100]}")
                sys.exit(1)
            product = r.json()

            image = make_image(name, brand, PALETTES[cat_name])
            r = session.post(
                f"{API}/products/{product['id']}/images",
                files={"images": (f"{product['id']}.jpg", image, "image/jpeg")},
                headers=headers,
                timeout=30,
            )
            if r.status_code != 201:
                print(f"  [image] ERREUR {r.status_code} : {name} -> {r.text[:100]}")
                sys.exit(1)
            total_products += 1
            print(f"  [produit] {name} — {price} € (image OK)")

    print(f"\nTerminé : {len(VENDORS)} vendeurs, {total_products} produits avec image, {len(categories)} catégories.")


if __name__ == "__main__":
    main()
