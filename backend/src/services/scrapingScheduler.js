const cron = require('node-cron');
const storeModel = require('../models/storeModel');
const { enqueueAllActiveStores } = require('./scrapingService');
const logger = require('./../utils/logger');

/**
 * Planification automatique du scraping (exigence "horaire / quotidien").
 * Activée uniquement si SCRAPING_CRON est défini dans l'environnement,
 * ex: "0 * * * *" (toutes les heures) ou "0 6 * * *" (tous les jours à 6h).
 */
function startScrapingScheduler() {
  const expression = process.env.SCRAPING_CRON;
  if (!expression) {
    logger.info('SCRAPING_CRON non défini — planification du scraping désactivée');
    return null;
  }

  if (!cron.validate(expression)) {
    logger.error(`SCRAPING_CRON invalide: "${expression}" — planification désactivée`);
    return null;
  }

  const task = cron.schedule(expression, async () => {
    try {
      const count = await enqueueAllActiveStores(storeModel);
      logger.info(`Scraping planifié: ${count} store(s) mis en file`);
    } catch (err) {
      logger.error('Échec du scraping planifié', { error: err.message });
    }
  });

  logger.info(`Planification du scraping active (${expression})`);
  return task;
}

module.exports = { startScrapingScheduler };
