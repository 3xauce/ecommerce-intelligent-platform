const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Erreur inattendue sur le pool PostgreSQL', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
