/**
 * Implémentation en mémoire du module config/db, utilisée à la place de
 * PostgreSQL dans les tests (jest.mock). Reproduit uniquement les requêtes
 * réellement émises par userModel / tokenModel.
 */
const PUBLIC_FIELDS = [
  'id',
  'email',
  'role',
  'first_name',
  'last_name',
  'is_active',
  'created_at',
  'updated_at',
];

let users = [];
let refreshTokens = [];
let passwordResetTokens = [];
let seq = 1;

function nextId(prefix) {
  return `${prefix}-${seq++}`;
}

function sanitizeUser(user) {
  const result = {};
  PUBLIC_FIELDS.forEach((f) => {
    result[f] = user[f];
  });
  return result;
}

function reset() {
  users = [];
  refreshTokens = [];
  passwordResetTokens = [];
  seq = 1;
}

async function query(text, params = []) {
  const sql = text.replace(/\s+/g, ' ').trim();

  // --- users ---
  if (sql.startsWith('INSERT INTO users')) {
    const [email, password_hash, role, first_name, last_name] = params;
    const user = {
      id: nextId('user'),
      email,
      password_hash,
      role,
      first_name,
      last_name,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    users.push(user);
    return { rows: [sanitizeUser(user)] };
  }

  if (sql.startsWith('SELECT * FROM users WHERE email')) {
    const user = users.find((u) => u.email === params[0]);
    return { rows: user ? [user] : [] };
  }

  if (sql.startsWith('SELECT * FROM users WHERE id')) {
    const user = users.find((u) => u.id === params[0]);
    return { rows: user ? [user] : [] };
  }

  if (sql.includes('FROM users WHERE id') && sql.startsWith('SELECT')) {
    const user = users.find((u) => u.id === params[0]);
    return { rows: user ? [sanitizeUser(user)] : [] };
  }

  if (sql.startsWith('SELECT') && sql.includes('FROM users ORDER BY')) {
    const [limit, offset] = params;
    return { rows: users.slice(offset, offset + limit).map(sanitizeUser) };
  }

  if (sql.startsWith('UPDATE users SET role')) {
    const [role, id] = params;
    const user = users.find((u) => u.id === id);
    if (!user) return { rows: [] };
    user.role = role;
    return { rows: [sanitizeUser(user)] };
  }

  if (sql.startsWith('UPDATE users SET first_name')) {
    const [first_name, last_name, id] = params;
    const user = users.find((u) => u.id === id);
    if (!user) return { rows: [] };
    user.first_name = first_name;
    user.last_name = last_name;
    return { rows: [sanitizeUser(user)] };
  }

  if (sql.startsWith('UPDATE users SET password_hash')) {
    const [password_hash, id] = params;
    const user = users.find((u) => u.id === id);
    if (user) user.password_hash = password_hash;
    return { rows: [] };
  }

  // --- refresh_tokens ---
  if (sql.startsWith('INSERT INTO refresh_tokens')) {
    const [user_id, token_hash, expires_at] = params;
    refreshTokens.push({
      id: nextId('rt'),
      user_id,
      token_hash,
      expires_at,
      revoked_at: null,
    });
    return { rows: [] };
  }

  if (sql.startsWith('SELECT * FROM refresh_tokens')) {
    const [token_hash] = params;
    const record = refreshTokens.find(
      (t) => t.token_hash === token_hash && !t.revoked_at && t.expires_at > new Date()
    );
    return { rows: record ? [record] : [] };
  }

  if (sql.startsWith('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash')) {
    const [token_hash] = params;
    const record = refreshTokens.find((t) => t.token_hash === token_hash);
    if (record) record.revoked_at = new Date();
    return { rows: [] };
  }

  if (sql.startsWith('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id')) {
    const [user_id] = params;
    refreshTokens
      .filter((t) => t.user_id === user_id && !t.revoked_at)
      .forEach((t) => {
        t.revoked_at = new Date();
      });
    return { rows: [] };
  }

  // --- password_reset_tokens ---
  if (sql.startsWith('INSERT INTO password_reset_tokens')) {
    const [user_id, token_hash, expires_at] = params;
    passwordResetTokens.push({
      id: nextId('prt'),
      user_id,
      token_hash,
      expires_at,
      used_at: null,
    });
    return { rows: [] };
  }

  if (sql.startsWith('SELECT * FROM password_reset_tokens')) {
    const [token_hash] = params;
    const record = passwordResetTokens.find(
      (t) => t.token_hash === token_hash && !t.used_at && t.expires_at > new Date()
    );
    return { rows: record ? [record] : [] };
  }

  if (sql.startsWith('UPDATE password_reset_tokens SET used_at')) {
    const [id] = params;
    const record = passwordResetTokens.find((t) => t.id === id);
    if (record) record.used_at = new Date();
    return { rows: [] };
  }

  throw new Error(`fakeDb: requête non gérée -> ${sql}`);
}

module.exports = {
  query,
  pool: { connect: async () => ({ query, release: () => {} }), end: async () => {} },
  __reset: reset,
  __users: () => users,
};
