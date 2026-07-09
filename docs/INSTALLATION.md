# Guide d'Installation

## Prérequis
- Node.js >= 20.x
- Python >= 3.11
- Docker & Docker Compose
- PostgreSQL >= 15.x

## Démarrage rapide

```bash
git clone https://github.com/3xauce/ecommerce-intelligent-platform.git
cd ecommerce-intelligent-platform
cp backend/.env.example backend/.env
docker-compose up --build
```

L'application sera disponible sur http://localhost:3010 (frontend) et http://localhost:5001/api-docs (API/Swagger).

> Ports Docker volontairement décalés des valeurs par défaut (PostgreSQL sur
> 5433, Redis sur 6380, frontend sur 3010, backend sur 5001) pour éviter tout
> conflit avec d'autres projets/services déjà lancés sur la machine (5000 est
> par ailleurs réservé par Windows/Hyper-V sur certaines configurations).
