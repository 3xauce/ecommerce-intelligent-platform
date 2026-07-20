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
let orders = [];
let shops = [];
let orderItems = [];
let competitorStores = [];
let scrapedProducts = [];
let predictions = [];
let notifications = [];
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
  orders = [];
  shops = [];
  orderItems = [];
  competitorStores = [];
  scrapedProducts = [];
  predictions = [];
  notifications = [];
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

  // --- contrôle de transaction (utilisé par orderService via db.pool.connect()) ---
  if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
    return { rows: [] };
  }

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

  // --- décrément atomique de stock (checkout) ---
  if (sql.startsWith('UPDATE products SET stock = stock -')) {
    const [quantity, id] = params;
    const product = products.find((p) => p.id === id);
    if (!product || product.stock < quantity || !product.is_active) return { rows: [] };
    product.stock -= quantity;
    product.updated_at = new Date();
    return { rows: [product] };
  }

  // --- orders / order_items ---
  if (sql.startsWith('INSERT INTO orders')) {
    const [customer_id, total, currency, shipping_address, stripe_payment_id] = params;
    const order = {
      id: nextId(),
      customer_id,
      status: 'pending',
      total: Number(total),
      currency,
      stripe_payment_id: stripe_payment_id || null,
      shipping_address: shipping_address || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    orders.push(order);
    return { rows: [order] };
  }

  if (sql.startsWith('INSERT INTO order_items')) {
    const [order_id, product_id, quantity, unit_price] = params;
    const item = {
      id: seq++,
      order_id,
      product_id,
      quantity,
      unit_price: Number(unit_price),
    };
    orderItems.push(item);
    return { rows: [item] };
  }

  if (sql.startsWith('SELECT * FROM orders WHERE id')) {
    const order = orders.find((o) => o.id === params[0]);
    return { rows: order ? [order] : [] };
  }

  if (sql.startsWith('SELECT * FROM orders WHERE stripe_payment_id')) {
    const order = orders.find((o) => o.stripe_payment_id === params[0]);
    return { rows: order ? [order] : [] };
  }

  if (sql.startsWith('SELECT * FROM orders WHERE customer_id')) {
    const [customerId, limit, offset] = params;
    const rows = orders
      .filter((o) => o.customer_id === customerId)
      .sort((a, b) => b.created_at - a.created_at)
      .slice(offset, offset + limit);
    return { rows };
  }

  if (sql.startsWith('SELECT oi.*') && sql.includes('FROM order_items oi')) {
    const [orderId] = params;
    const rows = orderItems
      .filter((oi) => oi.order_id === orderId)
      .map((oi) => ({ ...oi, product_name: products.find((p) => p.id === oi.product_id)?.name }));
    return { rows };
  }

  if (sql.startsWith('UPDATE orders SET status')) {
    const [status, id] = params;
    const order = orders.find((o) => o.id === id);
    if (!order) return { rows: [] };
    order.status = status;
    order.updated_at = new Date();
    return { rows: [order] };
  }

  // --- notifications ---
  if (sql.startsWith('INSERT INTO notifications')) {
    const [user_id, channel, title, message] = params;
    const notification = {
      id: nextId(),
      user_id,
      channel,
      title,
      message: message || null,
      is_read: false,
      created_at: new Date(),
    };
    notifications.push(notification);
    return { rows: [notification] };
  }

  if (sql.startsWith('SELECT * FROM notifications WHERE user_id')) {
    const [userId, limit, offset] = params;
    const rows = notifications
      .filter((n) => n.user_id === userId)
      .sort((a, b) => b.created_at - a.created_at)
      .slice(offset, offset + limit);
    return { rows };
  }

  if (sql.includes('AS unread_count')) {
    const [userId] = params;
    const mine = notifications.filter((n) => n.user_id === userId);
    return {
      rows: [{ unread_count: mine.filter((n) => !n.is_read).length, total: mine.length }],
    };
  }

  if (sql.startsWith('UPDATE notifications SET is_read = true WHERE id')) {
    const [id, userId] = params;
    const notification = notifications.find((n) => n.id === id && n.user_id === userId);
    if (!notification) return { rows: [] };
    notification.is_read = true;
    return { rows: [notification] };
  }

  if (sql.startsWith('UPDATE notifications SET is_read = true WHERE user_id')) {
    const [userId] = params;
    notifications.filter((n) => n.user_id === userId).forEach((n) => {
      n.is_read = true;
    });
    return { rows: [] };
  }

  // --- admin ---
  if (sql.startsWith('SELECT role, COUNT(*)::int AS count FROM users')) {
    const byRole = {};
    for (const user of users) byRole[user.role] = (byRole[user.role] || 0) + 1;
    return { rows: Object.entries(byRole).map(([role, count]) => ({ role, count })) };
  }

  if (sql.startsWith('SELECT o.*, u.email AS customer_email')) {
    const [limit, offset] = params;
    const rows = [...orders]
      .sort((a, b) => b.created_at - a.created_at)
      .slice(offset, offset + limit)
      .map((order) => {
        const customer = users.find((u) => u.id === order.customer_id);
        return {
          ...order,
          customer_email: customer?.email || null,
          first_name: customer?.first_name || null,
          last_name: customer?.last_name || null,
        };
      });
    return { rows };
  }

  if (sql.startsWith('UPDATE users SET is_active')) {
    const [is_active, id] = params;
    const user = users.find((u) => u.id === id);
    if (!user) return { rows: [] };
    user.is_active = is_active;
    return { rows: [sanitizeUser(user)] };
  }

  // --- prédictions IA (avant analytics : partage GROUP BY DATE) ---
  if (sql.includes('SUM(oi.quantity)::int AS units FROM')) {
    const [productId] = params;
    const byDay = {};
    for (const oi of orderItems) {
      if (oi.product_id !== productId) continue;
      const order = orders.find((o) => o.id === oi.order_id);
      if (!order || order.status === 'payment_failed') continue;
      const day = order.created_at.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + oi.quantity;
    }
    const rows = Object.entries(byDay)
      .map(([day, units]) => ({ day, units }))
      .sort((a, b) => a.day.localeCompare(b.day));
    return { rows };
  }

  if (sql.startsWith('INSERT INTO predictions')) {
    const [product_id, prediction_type, predicted_value, confidence, period_days] = params;
    const prediction = {
      id: nextId(),
      product_id,
      prediction_type,
      predicted_value: Number(predicted_value),
      confidence: Number(confidence),
      period_days,
      created_at: new Date(),
    };
    predictions.push(prediction);
    return { rows: [prediction] };
  }

  if (sql.startsWith('SELECT * FROM predictions WHERE product_id')) {
    const [productId, limit] = params;
    const rows = predictions
      .filter((p) => p.product_id === productId)
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, limit);
    return { rows };
  }

  // --- analytics (agrégats calculés en mémoire) ---
  if (sql.includes('AS products_count') && !sql.includes('FROM shops')) {
    const [vendorId] = params;
    const scoped = products.filter((p) => !vendorId || p.vendor_id === vendorId);
    return {
      rows: [
        {
          products_count: scoped.length,
          active_products: scoped.filter((p) => p.is_active).length,
          low_stock_count: scoped.filter((p) => p.stock <= 5).length,
        },
      ],
    };
  }

  if (sql.includes('AS revenue_paid')) {
    const [vendorId] = params;
    const lines = orderItems
      .map((oi) => ({
        oi,
        order: orders.find((o) => o.id === oi.order_id),
        product: products.find((p) => p.id === oi.product_id),
      }))
      .filter(
        ({ order, product }) =>
          order &&
          order.status !== 'payment_failed' &&
          (!vendorId || product?.vendor_id === vendorId)
      );
    const sum = (status) =>
      lines
        .filter(({ order }) => order.status === status)
        .reduce((acc, { oi }) => acc + oi.quantity * oi.unit_price, 0);
    return {
      rows: [
        {
          orders_count: new Set(lines.map(({ order }) => order.id)).size,
          revenue_paid: sum('paid'),
          revenue_pending: sum('pending'),
        },
      ],
    };
  }

  if (sql.includes('AS stores_count')) {
    const [vendorId] = params;
    const scopedStores = competitorStores.filter((s) => !vendorId || s.vendor_id === vendorId);
    const storeIds = new Set(scopedStores.map((s) => s.id));
    return {
      rows: [
        {
          stores_count: scopedStores.length,
          scraped_products_count: scrapedProducts.filter((p) => storeIds.has(p.store_id)).length,
        },
      ],
    };
  }

  if (sql.includes('GROUP BY DATE(o.created_at)')) {
    const [vendorId] = params;
    const byDay = {};
    for (const oi of orderItems) {
      const order = orders.find((o) => o.id === oi.order_id);
      const product = products.find((p) => p.id === oi.product_id);
      if (!order || order.status === 'payment_failed') continue;
      if (vendorId && product?.vendor_id !== vendorId) continue;
      const day = order.created_at.toISOString().slice(0, 10);
      byDay[day] = byDay[day] || { day, revenue: 0, orderIds: new Set() };
      byDay[day].revenue += oi.quantity * oi.unit_price;
      byDay[day].orderIds.add(order.id);
    }
    const rows = Object.values(byDay)
      .map(({ day, revenue, orderIds }) => ({ day, revenue, orders: orderIds.size }))
      .sort((a, b) => a.day.localeCompare(b.day));
    return { rows };
  }

  if (sql.includes('AS units_sold')) {
    const [vendorId, limit] = params;
    const byProduct = {};
    for (const oi of orderItems) {
      const order = orders.find((o) => o.id === oi.order_id);
      const product = products.find((p) => p.id === oi.product_id);
      if (!order || order.status === 'payment_failed' || !product) continue;
      if (vendorId && product.vendor_id !== vendorId) continue;
      byProduct[product.id] = byProduct[product.id] || {
        id: product.id,
        name: product.name,
        units_sold: 0,
        revenue: 0,
      };
      byProduct[product.id].units_sold += oi.quantity;
      byProduct[product.id].revenue += oi.quantity * oi.unit_price;
    }
    const rows = Object.values(byProduct)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
    return { rows };
  }

  if (sql.startsWith('SELECT cs.id, cs.name, cs.platform')) {
    const [vendorId] = params;
    const rows = competitorStores
      .filter((s) => !vendorId || s.vendor_id === vendorId)
      .map((store) => {
        const prices = scrapedProducts
          .filter((p) => p.store_id === store.id)
          .map((p) => p.price)
          .filter((p) => p !== null && p !== undefined);
        return {
          id: store.id,
          name: store.name,
          platform: store.platform,
          last_scraped_at: store.last_scraped_at,
          scraped_count: scrapedProducts.filter((p) => p.store_id === store.id).length,
          avg_price: prices.length
            ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
            : null,
          min_price: prices.length ? Math.min(...prices) : null,
          max_price: prices.length ? Math.max(...prices) : null,
        };
      });
    return { rows };
  }

  if (sql.startsWith('SELECT cs.name AS store_name, TO_CHAR')) {
    const [vendorId] = params;
    const byKey = {};
    for (const sp of scrapedProducts) {
      const store = competitorStores.find((s) => s.id === sp.store_id);
      if (!store || (vendorId && store.vendor_id !== vendorId)) continue;
      if (sp.price === null || sp.price === undefined) continue;
      const day = sp.scraped_at.toISOString().slice(0, 10);
      const key = `${store.name}|${day}`;
      byKey[key] = byKey[key] || { store_name: store.name, day, prices: [] };
      byKey[key].prices.push(sp.price);
    }
    const rows = Object.values(byKey)
      .map(({ store_name, day, prices }) => ({
        store_name,
        day,
        avg_price: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
    return { rows };
  }

  if (sql.startsWith('SELECT sp.product_name')) {
    const [vendorId, limit] = params;
    const rows = scrapedProducts
      .map((sp) => ({ sp, store: competitorStores.find((s) => s.id === sp.store_id) }))
      .filter(({ store }) => store && (!vendorId || store.vendor_id === vendorId))
      .sort((a, b) => b.sp.scraped_at - a.sp.scraped_at)
      .slice(0, limit)
      .map(({ sp, store }) => ({
        product_name: sp.product_name,
        price: sp.price,
        stock_status: sp.stock_status,
        url: sp.url,
        scraped_at: sp.scraped_at,
        store_name: store.name,
      }));
    return { rows };
  }

  // --- competitor_stores ---
  if (sql.startsWith('INSERT INTO competitor_stores')) {
    const [vendor_id, name, url, platform, css_selectors] = params;
    const store = {
      id: nextId(),
      vendor_id,
      name,
      url,
      platform,
      css_selectors: css_selectors ? JSON.parse(css_selectors) : null,
      is_active: true,
      last_scraped_at: null,
      created_at: new Date(),
    };
    competitorStores.push(store);
    return { rows: [store] };
  }

  if (sql.startsWith('SELECT * FROM competitor_stores WHERE id')) {
    const store = competitorStores.find((s) => s.id === params[0]);
    return { rows: store ? [store] : [] };
  }

  if (sql.startsWith('SELECT * FROM competitor_stores WHERE vendor_id')) {
    const rows = competitorStores
      .filter((s) => s.vendor_id === params[0])
      .sort((a, b) => b.created_at - a.created_at);
    return { rows };
  }

  if (sql.startsWith('SELECT * FROM competitor_stores WHERE is_active')) {
    return { rows: competitorStores.filter((s) => s.is_active) };
  }

  if (sql.startsWith('SELECT * FROM competitor_stores ORDER BY')) {
    return { rows: [...competitorStores].sort((a, b) => b.created_at - a.created_at) };
  }

  if (sql.startsWith('UPDATE competitor_stores SET name')) {
    const [name, url, platform, css_selectors, is_active, id] = params;
    const store = competitorStores.find((s) => s.id === id);
    if (!store) return { rows: [] };
    Object.assign(store, {
      name,
      url,
      platform,
      css_selectors: css_selectors ? JSON.parse(css_selectors) : null,
      is_active,
    });
    return { rows: [store] };
  }

  if (sql.startsWith('DELETE FROM competitor_stores WHERE id')) {
    const before = competitorStores.length;
    competitorStores = competitorStores.filter((s) => s.id !== params[0]);
    return { rows: [], rowCount: before - competitorStores.length };
  }

  // --- scraped_products ---
  if (sql.startsWith('SELECT * FROM scraped_products WHERE store_id')) {
    const [storeId, limit, offset] = params;
    const rows = scrapedProducts
      .filter((p) => p.store_id === storeId)
      .sort((a, b) => b.scraped_at - a.scraped_at)
      .slice(offset, offset + limit);
    return { rows };
  }

  if (sql.startsWith('SELECT COUNT(*)::int AS total FROM scraped_products')) {
    const total = scrapedProducts.filter((p) => p.store_id === params[0]).length;
    return { rows: [{ total }] };
  }

  // --- shops ---
  if (sql.startsWith('INSERT INTO shops')) {
    const [vendor_id, name, description] = params;
    const shop = {
      id: nextId(),
      vendor_id,
      name,
      description: description || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    shops.push(shop);
    return { rows: [shop] };
  }

  if (sql.startsWith('SELECT * FROM shops WHERE vendor_id')) {
    const shop = shops.find((s) => s.vendor_id === params[0]);
    return { rows: shop ? [shop] : [] };
  }

  if (sql.startsWith('UPDATE shops SET name')) {
    const [name, description, vendor_id] = params;
    const shop = shops.find((s) => s.vendor_id === vendor_id);
    if (!shop) return { rows: [] };
    shop.name = name;
    shop.description = description || null;
    shop.updated_at = new Date();
    return { rows: [shop] };
  }

  if (sql.startsWith('SELECT s.*,') && sql.includes('FROM shops s')) {
    const rows = shops
      .map((s) => {
        const vendor = users.find((u) => u.id === s.vendor_id) || {};
        const vendorProducts = products.filter((p) => p.vendor_id === s.vendor_id);
        return {
          ...s,
          vendor_first_name: vendor.first_name,
          vendor_last_name: vendor.last_name,
          vendor_email: vendor.email,
          products_count: vendorProducts.length,
          active_products_count: vendorProducts.filter((p) => p.is_active).length,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return { rows };
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
  __predictions: () => predictions,
  __seedScrapedProduct: (row) => {
    scrapedProducts.push({
      id: nextId(),
      stock_status: 'in_stock',
      url: 'https://exemple.test/produit',
      scraped_at: new Date(),
      raw_data: {},
      ...row,
    });
  },
};
