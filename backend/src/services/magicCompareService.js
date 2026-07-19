const ApiError = require('../utils/ApiError');

/**
 * "Magic Compare" : analyse instantanée d'une URL produit concurrente.
 * Extraction par ordre de fiabilité : JSON-LD (schema.org/Product),
 * puis balises OpenGraph, puis heuristique de prix dans le HTML.
 */

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!response.ok) {
      throw new ApiError(400, `La page a renvoyé une erreur HTTP ${response.status}`);
    }
    return await response.text();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, "Impossible de charger cette URL (délai dépassé ou site inaccessible)");
  } finally {
    clearTimeout(timer);
  }
}

function findProductNode(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findProductNode(item);
      if (found) return found;
    }
    return null;
  }
  const type = node['@type'];
  if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) return node;
  if (node['@graph']) return findProductNode(node['@graph']);
  return null;
}

function parsePriceText(raw) {
  if (raw === null || raw === undefined) return null;
  const match = String(raw).replace(/[\s  ]/g, '').match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!match) return null;
  return parseFloat(match[1].replace(',', '.'));
}

function extractFromJsonLd(html) {
  const scripts = [
    ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  for (const [, content] of scripts) {
    let data;
    try {
      data = JSON.parse(content.trim());
    } catch {
      continue;
    }
    const product = findProductNode(data);
    if (!product) continue;

    const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
    const price = parsePriceText(offers?.price ?? offers?.lowPrice);
    return {
      name: product.name || null,
      price,
      currency: offers?.priceCurrency || null,
      source: 'json-ld',
    };
  }
  return null;
}

function extractFromMeta(html) {
  const meta = (property) => {
    const match =
      html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i')) ||
      html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'));
    return match ? match[1] : null;
  };

  const name = meta('og:title');
  const price = parsePriceText(meta('product:price:amount') || meta('og:price:amount'));
  if (!name && price === null) return null;
  return { name, price, currency: meta('product:price:currency'), source: 'opengraph' };
}

const CURRENCY_BY_SYMBOL = { '€': 'EUR', '£': 'GBP', $: 'USD' };

function extractFallback(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

  // Par ordre de fiabilité : microdonnée itemprop, élément dont la classe
  // contient "price", symbole monétaire préfixé (£9.99) puis suffixé (9,99 €).
  let price = null;
  let currency = null;

  const itemprop = html.match(/itemprop=["']price["'][^>]*content=["']([\d.,]+)["']/i);
  if (itemprop) {
    price = parsePriceText(itemprop[1]);
  }

  if (price === null) {
    const priceClass = html.match(
      /class=["'][^"']*price[^"']*["'][^>]*>\s*([^<]*?([€£$])?\s*\d[\d\s  .,]*)</i
    );
    if (priceClass) {
      price = parsePriceText(priceClass[1]);
      const symbol = priceClass[1].match(/[€£$]/);
      if (symbol) currency = CURRENCY_BY_SYMBOL[symbol[0]];
    }
  }

  if (price === null) {
    const prefixed = html.match(/([€£$])\s*(\d{1,6}(?:[.,]\d{2})?)/);
    if (prefixed) {
      price = parsePriceText(prefixed[2]);
      currency = CURRENCY_BY_SYMBOL[prefixed[1]];
    }
  }

  if (price === null) {
    const suffixed = html.match(/(\d{1,6}(?:[.,]\d{2}))\s*(€|EUR|£|GBP|\$|USD)/);
    if (suffixed) {
      price = parsePriceText(suffixed[1]);
      currency = CURRENCY_BY_SYMBOL[suffixed[2]] || suffixed[2];
    }
  }

  if (!titleMatch && price === null) return null;
  return {
    name: titleMatch ? titleMatch[1].trim() : null,
    price,
    currency,
    source: 'heuristique',
  };
}

function extractProductInfo(html) {
  return extractFromJsonLd(html) || extractFromMeta(html) || extractFallback(html);
}

/** Similarité de Jaccard sur les tokens des noms de produits. */
function nameSimilarity(a, b) {
  const tokenize = (text) =>
    new Set(
      String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 2)
    );
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter((t) => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

function compareWithCatalog(detected, catalogProducts) {
  let best = null;
  for (const product of catalogProducts) {
    const similarity = nameSimilarity(detected.name || '', product.name);
    if (similarity >= 0.2 && (!best || similarity > best.similarity)) {
      best = { product, similarity };
    }
  }
  if (!best) return null;

  const myPrice = Number(best.product.price);
  const theirPrice = detected.price;
  let positioning = null;
  let priceDiff = null;
  let priceDiffPct = null;

  if (theirPrice !== null && theirPrice > 0) {
    priceDiff = Math.round((myPrice - theirPrice) * 100) / 100;
    priceDiffPct = Math.round(((myPrice - theirPrice) / theirPrice) * 1000) / 10;
    if (priceDiffPct > 2) positioning = 'plus_cher';
    else if (priceDiffPct < -2) positioning = 'moins_cher';
    else positioning = 'aligne';
  }

  return {
    product: {
      id: best.product.id,
      name: best.product.name,
      price: myPrice,
      stock: best.product.stock,
    },
    similarity: Math.round(best.similarity * 100) / 100,
    price_diff: priceDiff,
    price_diff_pct: priceDiffPct,
    positioning,
  };
}

async function magicCompare(url, catalogProducts) {
  const html = await fetchPage(url);
  const detected = extractProductInfo(html);

  if (!detected || (!detected.name && detected.price === null)) {
    throw new ApiError(
      422,
      "Impossible d'extraire un produit de cette page (pas de données structurées détectées)"
    );
  }

  return {
    source_url: url,
    detected,
    best_match: compareWithCatalog(detected, catalogProducts),
  };
}

module.exports = { magicCompare, extractProductInfo, nameSimilarity };
