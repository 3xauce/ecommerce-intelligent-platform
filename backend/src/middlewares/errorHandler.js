const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details || undefined,
    });
  }

  logger.error(err.message, { stack: err.stack });
  return res.status(500).json({ error: 'Erreur interne du serveur' });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({ error: `Route introuvable: ${req.method} ${req.originalUrl}` });
};

module.exports = { errorHandler, notFoundHandler };
