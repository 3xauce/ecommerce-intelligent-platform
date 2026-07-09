require('dotenv').config();

const bcrypt = require('bcrypt');
const { pool, query } = require('../config/db');
const logger = require('../utils/logger');

const SALT_ROUNDS = 10;

const DEFAULT_USERS = [
  {
    email: 'admin@platform.com',
    password: 'Admin123!',
    role: 'admin',
    first_name: 'Admin',
    last_name: 'Platform',
  },
  {
    email: 'vendeur@platform.com',
    password: 'Vendeur123!',
    role: 'vendeur',
    first_name: 'Vendeur',
    last_name: 'Demo',
  },
  {
    email: 'client@platform.com',
    password: 'Client123!',
    role: 'client',
    first_name: 'Client',
    last_name: 'Demo',
  },
];

async function seed() {
  for (const user of DEFAULT_USERS) {
    const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
    await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [user.email, passwordHash, user.role, user.first_name, user.last_name]
    );
    logger.info(`Utilisateur seedé (ou déjà existant): ${user.email}`);
  }
}

if (require.main === module) {
  seed()
    .then(() => {
      logger.info('Seed terminé.');
      return pool.end();
    })
    .catch((err) => {
      logger.error(err.message);
      process.exitCode = 1;
      return pool.end();
    });
}

module.exports = { seed };
