const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const SCRAPING_QUEUE = 'scraping:jobs';

/**
 * Pousse un job de scraping dans la file Redis. Le worker Python
 * (scraper/worker.py) consomme cette file et exécute le spider adapté.
 */
async function enqueueScrapingJob(store) {
  const client = await getRedisClient();
  const job = {
    store_id: store.id,
    enqueued_at: new Date().toISOString(),
  };
  await client.lPush(SCRAPING_QUEUE, JSON.stringify(job));
  logger.info('Job de scraping mis en file', { storeId: store.id, storeName: store.name });
  return job;
}

async function enqueueAllActiveStores(storeModel) {
  const stores = await storeModel.listActive();
  for (const store of stores) {
    await enqueueScrapingJob(store);
  }
  return stores.length;
}

module.exports = { enqueueScrapingJob, enqueueAllActiveStores, SCRAPING_QUEUE };
