const db = require('../config/db');

const PUBLIC_COLUMNS = 'id, email, role, first_name, last_name, is_active, created_at, updated_at';

function sanitize(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

async function create({ email, passwordHash, role, firstName, lastName }) {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, role, first_name, last_name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PUBLIC_COLUMNS}`,
    [email, passwordHash, role, firstName, lastName]
  );
  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function findByIdWithPassword(id) {
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function list({ limit = 50, offset = 0 } = {}) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function updateRole(id, role) {
  const { rows } = await db.query(
    `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING ${PUBLIC_COLUMNS}`,
    [role, id]
  );
  return rows[0] || null;
}

async function updateProfile(id, { firstName, lastName }) {
  const { rows } = await db.query(
    `UPDATE users SET first_name = $1, last_name = $2, updated_at = NOW()
     WHERE id = $3 RETURNING ${PUBLIC_COLUMNS}`,
    [firstName, lastName, id]
  );
  return rows[0] || null;
}

async function updatePassword(id, passwordHash) {
  await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    passwordHash,
    id,
  ]);
}

module.exports = {
  sanitize,
  create,
  findByEmail,
  findById,
  findByIdWithPassword,
  list,
  updateRole,
  updateProfile,
  updatePassword,
};
