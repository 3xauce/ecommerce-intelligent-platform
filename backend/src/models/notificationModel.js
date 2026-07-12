const db = require('../config/db');

async function create({ userId, channel = 'in_app', title, message }) {
  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, channel, title, message)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, channel, title, message || null]
  );
  return rows[0];
}

async function listByUser(userId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await db.query(
    `SELECT * FROM notifications WHERE user_id = $1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) FILTER (WHERE NOT is_read)::int AS unread_count,
            COUNT(*)::int AS total
     FROM notifications WHERE user_id = $1`,
    [userId]
  );

  return { items: rows, ...countRows[0] };
}

async function markRead(id, userId) {
  const { rows } = await db.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
    [id, userId]
  );
  return rows[0] || null;
}

async function markAllRead(userId) {
  await db.query(`UPDATE notifications SET is_read = true WHERE user_id = $1 AND NOT is_read`, [
    userId,
  ]);
}

module.exports = { create, listByUser, markRead, markAllRead };
