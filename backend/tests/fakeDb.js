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
let categories = [];
let products = [];
let carts = [];
let cartItems = [];
let seq = 1;

const crypto = require('crypto');

// Les tables users/products/carts/cart_items/refresh_tokens/password_reset_tokens
// utilisent des UUID en base réelle (voir database/migrations) — Joi valide
// ces champs avec .uuid(), donc les faux IDs doivent aussi en être.
function nextId() {
  return crypto.randomUUID();
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
  categories = [];
  products = [];
  carts = [];
  cartItems = [];
  seq = 1;
}

/**
 * Interprète les clauses WHERE générées par productModel.list/COUNT (voir
 * backend/src/models/productModel.js) contre un produit en mémoire. Couvre
 * exactement les conditions que ce modèle est capable de générer.
 */
function productMatchesWhere(product, whereText, params) {
  if (!whereText) return true;
  const clause = whereText.replace(/^WHERE\s+/, '');
  const conditions = clause.split(' AND ');

  return conditions.every((rawCond) => {
    const cond = rawCond.trim();
    if (cond === 'is_active = true') return product.is_active === true;

    let m = cond.match(/^category_id = \$(\d+)$/);
    if (m) return String(product.category_id) === String(params[Number(m[1]) - 1]);

    m = cond.match(/^vendor_id = \$(\d+)$/);
    if (m) return String(product.vendor_id) === String(params[Number(m[1]) - 1]);

    m = cond.match(/^\(name ILIKE \$(\d+) OR description ILIKE \$(\d+)\)$/);
    if (m) {
      const term = String(params[Number(m[1]) - 1]).slice(1, -1).toLowerCase();
      return (
        (product.name || '').toLowerCase().includes(term) ||
        (product.description || '').toLowerCase().includes(term)
      );
    }

    m = cond.match(/^price >= \$(\d+)$/);
    if (m) return Number(product.price) >= Number(params[Number(m[1]) - 1]);

    m = cond.match(/^price <= \$(\d+)$/);
    if (m) return Number(product.price) <= Number(params[Number(m[1]) - 1]);

    throw new Error(`fakeDb: condition produit non gérée -> ${cond}`);
  });
}

function extractProductsWhere(sql) {
  const afterFrom = sql.split('FROM products')[1] || '';
  return afterFrom.split(' ORDER BY')[0].trim();
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

  // --- categories ---
  if (sql.startsWith('INSERT INTO categories')) {
    const [name, slug, parent_id] = params;
    const category = { id: seq++, name, slug, parent_id: parent_id || null, created_at: new Date() };
    categories.push(category);
    return { rows: [category] };
  }

  if (sql.startsWith('SELECT * FROM categories ORDER BY')) {
    return { rows: [...categories].sort((a, b) => a.name.localeCompare(b.name)) };
  }

  if (sql.startsWith('SELECT * FROM categories WHERE id')) {
    const category = categories.find((c) => String(c.id) === String(params[0]));
    return { rows: category ? [category] : [] };
  }

  if (sql.startsWith('SELECT * FROM categories WHERE slug')) {
    const category = categories.find((c) => c.slug === params[0]);
    return { rows: category ? [category] : [] };
  }

  if (sql.startsWith('UPDATE categories SET')) {
    const [name, slug, parent_id, id] = params;
    const category = categories.find((c) => String(c.id) === String(id));
    if (!category) return { rows: [] };
    category.name = name;
    category.slug = slug;
    category.parent_id = parent_id || null;
    return { rows: [category] };
  }

  if (sql.startsWith('DELETE FROM categories WHERE id')) {
    const before = categories.length;
    categories = categories.filter((c) => String(c.id) !== String(params[0]));
    return { rows: [], rowCount: before - categories.length };
  }

  // --- products ---
  if (sql.startsWith('INSERT INTO products')) {
    const [name, description, price, stock, category_id, vendor_id] = params;
    const product = {
      id: nextId('prod'),
      name,
      description: description || null,
      price: Number(price),
      stock: Number(stock),
      category_id: category_id || null,
      vendor_id,
      images: [],
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    products.push(product);
    return { rows: [product] };
  }

  if (sql.startsWith('SELECT * FROM products WHERE id')) {
    const product = products.find((p) => p.id === params[0]);
    return { rows: product ? [product] : [] };
  }

  if (sql.startsWith('SELECT COUNT(*)::int AS total FROM products')) {
    const whereText = extractProductsWhere(sql);
    const total = products.filter((p) => productMatchesWhere(p, whereText, params)).length;
    return { rows: [{ total }] };
  }

  if (sql.startsWith('SELECT * FROM products') && sql.includes('ORDER BY created_at DESC')) {
    const whereText = extractProductsWhere(sql);
    const limit = params[params.length - 2];
    const offset = params[params.length - 1];
    const filtered = products
      .filter((p) => productMatchesWhere(p, whereText, params))
      .sort((a, b) => b.created_at - a.created_at);
    return { rows: filtered.slice(offset, offset + limit) };
  }

  if (sql.startsWith('UPDATE products SET name')) {
    const [name, description, price, stock, category_id, is_active, id] = params;
    const product = products.find((p) => p.id === id);
    if (!product) return { rows: [] };
    Object.assign(product, {
      name,
      description: description || null,
      price: Number(price),
      stock: Number(stock),
      category_id: category_id || null,
      is_active,
      updated_at: new Date(),
    });
    return { rows: [product] };
  }

  if (sql.startsWith('DELETE FROM products WHERE id')) {
    const before = products.length;
    products = products.filter((p) => p.id !== params[0]);
    return { rows: [], rowCount: before - products.length };
  }

  if (sql.startsWith('UPDATE products') && sql.includes('images = images ||')) {
    const [urlsJson, id] = params;
    const product = products.find((p) => p.id === id);
    if (!product) return { rows: [] };
    product.images = [...product.images, ...JSON.parse(urlsJson)];
    return { rows: [product] };
  }

  if (sql.startsWith('UPDATE products') && sql.includes('jsonb_array_elements_text')) {
    const [url, id] = params;
    const product = products.find((p) => p.id === id);
    if (!product) return { rows: [] };
    product.images = product.images.filter((img) => img !== url);
    return { rows: [product] };
  }

  // --- carts / cart_items ---
  if (sql.startsWith('SELECT * FROM carts WHERE user_id')) {
    const cart = carts.find((c) => c.user_id === params[0]);
    return { rows: cart ? [cart] : [] };
  }

  if (sql.startsWith('INSERT INTO carts')) {
    const cart = { id: nextId('cart'), user_id: params[0] };
    carts.push(cart);
    return { rows: [cart] };
  }

  if (sql.startsWith('SELECT') && sql.includes('FROM cart_items ci') && sql.includes('JOIN products')) {
    const [cartId] = params;
    const rows = cartItems
      .filter((ci) => ci.cart_id === cartId)
      .sort((a, b) => a.created_at - b.created_at)
      .map((ci) => {
        const product = products.find((p) => p.id === ci.product_id);
        return {
          id: ci.id,
          product_id: ci.product_id,
          quantity: ci.quantity,
          created_at: ci.created_at,
          updated_at: ci.updated_at,
          product_name: product.name,
          product_price: product.price,
          product_stock: product.stock,
          product_is_active: product.is_active,
          product_images: product.images,
        };
      });
    return { rows };
  }

  if (sql.startsWith('SELECT * FROM cart_items WHERE cart_id') && sql.includes('AND product_id')) {
    const [cartId, productId] = params;
    const item = cartItems.find((ci) => ci.cart_id === cartId && ci.product_id === productId);
    return { rows: item ? [item] : [] };
  }

  if (sql.startsWith('INSERT INTO cart_items')) {
    const [cartId, productId, quantity] = params;
    const existing = cartItems.find((ci) => ci.cart_id === cartId && ci.product_id === productId);
    if (existing) {
      existing.quantity += quantity;
      existing.updated_at = new Date();
      return { rows: [existing] };
    }
    const item = {
      id: nextId('ci'),
      cart_id: cartId,
      product_id: productId,
      quantity,
      created_at: new Date(),
      updated_at: new Date(),
    };
    cartItems.push(item);
    return { rows: [item] };
  }

  if (sql.startsWith('UPDATE cart_items SET quantity')) {
    const [quantity, cartId, productId] = params;
    const item = cartItems.find((ci) => ci.cart_id === cartId && ci.product_id === productId);
    if (!item) return { rows: [] };
    item.quantity = quantity;
    item.updated_at = new Date();
    return { rows: [item] };
  }

  if (sql.startsWith('DELETE FROM cart_items WHERE cart_id') && sql.includes('AND product_id')) {
    const [cartId, productId] = params;
    const before = cartItems.length;
    cartItems = cartItems.filter((ci) => !(ci.cart_id === cartId && ci.product_id === productId));
    return { rows: [], rowCount: before - cartItems.length };
  }

  if (sql.startsWith('DELETE FROM cart_items WHERE cart_id')) {
    const [cartId] = params;
    cartItems = cartItems.filter((ci) => ci.cart_id !== cartId);
    return { rows: [] };
  }

  throw new Error(`fakeDb: requête non gérée -> ${sql}`);
}

module.exports = {
  query,
  pool: { connect: async () => ({ query, release: () => {} }), end: async () => {} },
  __reset: reset,
  __users: () => users,
  __categories: () => categories,
  __products: () => products,
};
