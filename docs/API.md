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

### Scraping
- `GET /api/scraping/stores` - Stores configurés
- `POST /api/scraping/stores` - Ajouter un store
- `POST /api/scraping/run/:storeId` - Lancer scraping

### Analytics
- `GET /api/analytics/dashboard` - KPIs dashboard
- `GET /api/analytics/competitors` - Données concurrents
- `GET /api/analytics/export/pdf` - Export PDF

### IA
- `GET /api/ai/predictions/:productId` - Prédictions ventes
- `POST /api/ai/magic-compare` - Analyse URL concurrente
