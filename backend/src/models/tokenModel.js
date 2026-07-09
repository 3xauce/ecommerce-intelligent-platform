const db = require('../config/db');

async function storeRefreshToken({ userId, tokenHash, expiresAt }) {
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );
}

async function findValidRefreshToken(tokenHash) {
  const { rows } = await db.query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function revokeRefreshToken(tokenHash) {
  await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [
    tokenHash,
  ]);
}

async function revokeAllUserRefreshTokens(userId) {
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
}

async function storePasswordResetToken({ userId, tokenHash, expiresAt }) {
  await db.query(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );
}

async function findValidPasswordResetToken(tokenHash) {
  const { rows } = await db.query(
    `SELECT * FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function markPasswordResetTokenUsed(id) {
  await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [id]);
}

module.exports = {
  storeRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  storePasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
};
