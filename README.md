# 🛒 Plateforme E-Commerce Intelligente avec Analyse Concurrentielle IA

> **Projet de Fin dEtudes (PFE)**  
> Auteur : **KAYA ALDJOUMA**  
> Encadrant Pédagogique : **Pr. MOHAMMAD HARRAK**  
> Tuteur Entreprise : **M. Badr BEN HICHOU**  
> Version : `1.0` | Date : Février 2026

---

## 📋 Table des Matières

- [Présentation](#-présentation)
- [Architecture du Système](#-architecture-du-système)
- [Stack Technologique](#-stack-technologique)
- [Modules Fonctionnels](#-modules-fonctionnels)
- [Structure du Projet](#-structure-du-projet)
- [Installation](#-installation)
- [Variables dEnvironnement](#-variables-denvironnement)
- [Utilisation](#-utilisation)
- [Tests](#-tests)
- [Déploiement](#-déploiement)
- [Planning](#-planning)
- [Contribution](#-contribution)

---

## 🎯 Présentation

Une **plateforme web intégrée** combinant e-commerce, web scraping et intelligence artificielle pour offrir une aide à la décision stratégique en temps réel.

### Problématique

> Comment concevoir une plateforme e-commerce capable de gérer ses propres ventes **ET** danalyser automatiquement les performances des produits chez les concurrents, afin doffrir au commerçant une aide à la décision stratégique en temps réel ?

### Solution

| Composant | Description |
|-----------|-------------|
| 🛍️ **Boutique en ligne** | Vente de biens matériels et immatériels |
| 🕷️ **Web Scraping** | Moteur paramétrable pour collecter des données concurrentielles |
| 🤖 **Module IA** | Analyse prédictive et recommandations intelligentes |
| 📊 **Dashboard analytique** | Tableaux de bord complets et personnalisables |

---

## 🏗️ Architecture du Système

```
ecommerce-intelligent-platform/
├── frontend/                  # React.js 18.x
│   ├── src/
│   │   ├── components/        # Composants réutilisables
│   │   ├── pages/             # Pages principales
│   │   ├── store/             # Redux Toolkit (state management)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # Appels API
│   │   └── utils/             # Utilitaires
│   └── public/
├── backend/                   # Node.js 20.x
│   ├── src/
│   │   ├── controllers/       # Logique métier
│   │   ├── models/            # Modèles de données
│   │   ├── routes/            # Routes API REST
│   │   ├── middlewares/       # Auth, validation, rate-limiting
│   │   ├── services/          # Services métier
│   │   └── utils/             # Utilitaires
│   └── tests/
├── scraper/                   # Python + Scrapy/Selenium
│   ├── spiders/               # Spiders par plateforme
│   ├── middlewares/           # User-agent, proxies
│   ├── pipelines/             # Traitement des données
│   └── config/                # Configuration des stores
├── ai-module/                 # TensorFlow.js / Scikit-learn
│   ├── models/                # Modèles ML entraînés
│   ├── training/              # Scripts dentraînement
│   └── predictions/           # API de prédictions
├── database/
│   └── migrations/            # Migrations PostgreSQL versionnées (001, 002, 003...)
├── docker/                    # Configuration Docker
├── .github/
│   └── workflows/             # GitHub Actions CI/CD
└── docs/                      # Documentation technique
```

---

## 🛠️ Stack Technologique

### Frontend
| Technologie | Version | Rôle |
|-------------|---------|------|
| **React.js** | 18.x | Framework UI principal |
| **Redux Toolkit** | 2.x | State management |
| **Tailwind CSS + Material-UI** | 3.x | Design system responsive |
| **Recharts / D3.js** | 2.x | Visualisations interactives |
| **jsPDF** | latest | Export PDF |

### Backend
| Technologie | Version | Rôle |
|-------------|---------|------|
| **Node.js** | 20.x | Serveur API |
| **Express.js** | 4.x | Framework web |
| **PostgreSQL** | 15.x | Base de données principale |
| **Supabase** | latest | Realtime + Auth |
| **JWT + bcrypt** | latest | Authentification sécurisée |
| **Stripe API / CMI** | 2025 | Paiement en ligne |

### Web Scraping
| Technologie | Version | Rôle |
|-------------|---------|------|
| **Python** | 3.11+ | Langage scraping |
| **Scrapy** | 4.x | Framework scraping robuste |
| **Selenium** | 4.x | Pages JavaScript dynamiques |
| **Proxies rotatifs** | — | Anti-détection |

### Intelligence Artificielle
| Technologie | Version | Rôle |
|-------------|---------|------|
| **TensorFlow.js** | 2.x | Prédictions côté client |
| **Scikit-learn** | latest | ML côté serveur |

### Infrastructure
| Technologie | Rôle |
|-------------|------|
| **Docker + Docker Compose** | Conteneurisation |
| **AWS** | Déploiement cloud |
| **GitHub Actions** | CI/CD automatisé |
| **Redis** | Caching + file dattente |

---

## 📦 Modules Fonctionnels

### 🛍️ Module E-Commerce
- Gestion catalogue (CRUD produits, catégories, stocks)
- Processus dachat (panier persistant, checkout 3 étapes)
- Paiement intégré (Stripe + CMI)
- Multidevises (USD, EUR, MAD, FCFA)
- Historique des commandes

### 🕷️ Module Web Scraping
- Configuration de 2 à N stores concurrents
- Support WooCommerce / Shopify / Autres
- Planification automatique (horaire / quotidien)
- Proxies rotatifs + rotation user-agents
- Taux de succès cible > 80%

### 📊 Module Analyse & Dashboard
- KPIs en temps réel
- Comparaison prix/ventes concurrents
- Heatmaps géographiques
- Export PDF / CSV
- Rapports programmés par email

### 🤖 Module Intelligence Artificielle
- Prévisions ventes (30 / 60 / 90 jours)
- Détection de tendances émergentes
- Optimisation des prix (tests A/B)
- Chatbot analytique (NLP)
- Magic Compare (analyse instantanée dURL)

### 🔔 Module Notifications
- Alertes prix / stock en temps réel
- Canaux multiples (email, Slack, in-app)
- Seuils personnalisables

### ⚙️ Module Administration
- Gestion utilisateurs & rôles
- Monitoring des services
- Logs système complets
- Gestion des quotas

---

## 🚀 Installation

### Prérequis

```bash
node >= 20.x
npm >= 10.x
python >= 3.11
docker & docker-compose
postgresql >= 15.x
```

### 1. Cloner le repository

```bash
git clone https://github.com/3xauce/ecommerce-intelligent-platform.git
cd ecommerce-intelligent-platform
```

### 2. Lancer avec Docker (recommandé)

```bash
docker-compose up --build
```

### 3. Installation manuelle

#### Backend
```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

#### Scraper (Python)
```bash
cd scraper
python -m venv venv
source venv/bin/activate  # Windows: venv\Scriptsctivate
pip install -r requirements.txt
```

---

## 🔐 Variables dEnvironnement

Créez un fichier `.env` à la racine du dossier `backend/` :

```env
# Base de données
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce_db
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Authentification
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret

# Paiement
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis
REDIS_URL=redis://localhost:6379

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password

# AWS
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=eu-west-1

# Scraping
PROXY_LIST_URL=your_proxy_provider_url
```

---

## 💻 Utilisation

### Accès aux interfaces

| Service | URL (installation manuelle) | URL (Docker Compose) | Description |
|---------|------------------------------|------------------------|-------------|
| 🖥️ Frontend | `http://localhost:3000` | `http://localhost:3010` | Interface utilisateur |
| 🔌 API Backend | `http://localhost:5001/api` | `http://localhost:5001/api` | API REST |
| 📚 Swagger | `http://localhost:5001/api-docs` | `http://localhost:5001/api-docs` | Documentation API |
| 🗄️ pgAdmin | — | `http://localhost:5050` | Administration BDD |

> Le port 5000 par défaut d'Express est volontairement évité (5001 utilisé) :
> il est réservé par Windows/Hyper-V sur certaines machines et provoque une
> erreur `EACCES` au démarrage. Les ports Docker (3010, 5433 Postgres, 6380
> Redis) sont eux aussi décalés pour ne pas entrer en conflit avec d'autres
> projets déjà lancés sur la machine.

### Comptes par défaut (développement)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | `admin@platform.com` | `Admin123!` |
| Vendeur | `vendeur@platform.com` | `Vendeur123!` |
| Client | `client@platform.com` | `Client123!` |

---

## 🧪 Tests

```bash
# Backend - Tests unitaires et intégration
cd backend
npm run test
npm run test:coverage   # Couverture > 80% requise

# Frontend - Tests composants
cd frontend
npm run test

# Scraper - Tests Python
cd scraper
pytest tests/ -v
```

---

## 🚢 Déploiement

### Docker Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### GitHub Actions CI/CD

Le pipeline CI/CD se déclenche automatiquement sur :
- `push` sur `main` → déploiement production
- `push` sur `develop` → déploiement staging
- Pull Requests → tests automatiques

---

## 📅 Planning (14 semaines)

| Phase | Période | Activités |
|-------|---------|-----------|
| **Phase 1** : Cadrage | S1 – S2 | Analyse besoins, spécifications |
| **Phase 2** : Conception | S3 – S4 | Architecture, maquettes Figma, UML |
| **Phase 3** : Core E-commerce | S5 – S7 | Catalogue, panier, auth, paiement |
| **Phase 4** : Web Scraping | S8 – S10 | Moteur scraping, configuration |
| **Phase 5** : IA & Analytics | S11 – S12 | Dashboard, prédictions, alertes |
| **Phase 6** : Intégration | S13 | Tests, corrections, déploiement |
| **Phase 7** : Finalisation | S14 | Documentation, soutenance |

---

## 🤝 Contribution

Ce projet suit la méthodologie **Agile SCRUM** avec des sprints de 2 semaines.

```bash
# Créer une branche feature
git checkout -b feature/nom-de-la-feature

# Committer
git commit -m "feat: description de la fonctionnalité"

# Ouvrir une Pull Request vers develop
```

### Convention de commits
- `feat:` nouvelle fonctionnalité
- `fix:` correction de bug
- `docs:` documentation
- `test:` ajout de tests
- `refactor:` refactoring

---

## 📄 Licence

Projet académique — Projet de Fin dEtudes 2026  
**KAYA ALDJOUMA** — Tous droits réservés

---

## 📞 Contact

**Auteur** : KAYA ALDJOUMA  
**Encadrant** : Pr. MOHAMMAD HARRAK  
**GitHub** : [@3xauce](https://github.com/3xauce)

