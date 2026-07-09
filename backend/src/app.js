const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const openapiSpec = require('./config/openapi');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { handleStripeWebhook } = require('./controllers/orderWebhookController');

const app = express();

// crossOriginResourcePolicy: 'cross-origin' — les images produits doivent
// pouvoir être chargées depuis le frontend (autre origine/port).
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// En développement, le port du serveur Vite peut changer (ex: 3000 déjà pris
// par un autre service) — on reflète alors l'origine de la requête plutôt que
// de la figer. En production, seule FRONTEND_URL est autorisée.
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : true,
  })
);

// Doit être monté AVANT express.json() : Stripe exige le corps brut (Buffer)
// pour vérifier la signature HMAC de la requête webhook.
app.post('/api/orders/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));

// Les routes suivantes sont ajoutées au fur et à mesure de leur implémentation :
// /api/scraping, /api/analytics, /api/ai, /api/admin

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
