const { createClient } = require('redis');
const logger = require('../utils/logger');

let client = null;

/**
 * Connexion Redis paresseuse : le serveur peut démarrer sans Redis, la
 * connexion n'est établie qu'au premier enqueue de job de scraping.
 */
async function getRedisClient() {
  if (client && client.isOpen) return client;

  client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  client.on('error', (err) => logger.error('Erreur client Redis', { error: err.message }));
  await client.connect();
  return client;
}

module.exports = { getRedisClient };
