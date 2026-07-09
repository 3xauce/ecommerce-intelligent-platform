# Documentation API

## Authentification
Toutes les routes protégées nécessitent un header `Authorization: Bearer <token>`

## Endpoints

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Rafraîchir le token

### Produits
- `GET /api/products` - Liste des produits
- `POST /api/products` - Créer un produit (vendeur)
- `PUT /api/products/:id` - Modifier un produit
- `DELETE /api/products/:id` - Supprimer un produit

### Commandes
- `GET /api/orders` - Mes commandes
- `POST /api/orders` - Créer une commande
- `GET /api/orders/:id` - Détail commande

### Scraping (vendeur/admin)
- `GET /api/scraping/stores` - Stores concurrents configurés
- `POST /api/scraping/stores` - Ajouter un store (platform: woocommerce | shopify | generic)
- `PUT /api/scraping/stores/:id` - Modifier / activer / désactiver un store
- `DELETE /api/scraping/stores/:id` - Supprimer un store et ses données
- `GET /api/scraping/stores/:id/products` - Produits scrapés (paginé)
- `POST /api/scraping/run/:storeId` - Lancer un scraping (job mis en file Redis,
  traité par le worker Python `scraper/worker.py`)

> Planification automatique : définir `SCRAPING_CRON` dans `backend/.env`
> (ex. `0 * * * *` pour un passage horaire sur tous les stores actifs).
> La documentation complète et à jour est servie par Swagger sur `/api-docs`.

### Analytics
- `GET /api/analytics/dashboard` - KPIs dashboard
- `GET /api/analytics/competitors` - Données concurrents
- `GET /api/analytics/export/pdf` - Export PDF

### IA
- `GET /api/ai/predictions/:productId` - Prédictions ventes
- `POST /api/ai/magic-compare` - Analyse URL concurrente
