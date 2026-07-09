const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const openapiSpec = require('./config/openapi');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// Les routes suivantes sont ajoutées au fur et à mesure de leur implémentation :
// /api/products, /api/orders, /api/scraping, /api/analytics, /api/ai, /api/admin

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
