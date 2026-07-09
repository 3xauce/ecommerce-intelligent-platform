require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');
const { startScrapingScheduler } = require('./services/scrapingScheduler');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  startScrapingScheduler();
});
