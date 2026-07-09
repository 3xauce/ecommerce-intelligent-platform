/**
 * Convertit une durée style JWT ("15m", "7d", "1h", "30s") en millisecondes.
 */
const UNITS = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };

function parseDuration(value) {
  const match = /^(\d+)(s|m|h|d)$/.exec(String(value).trim());
  if (!match) {
    throw new Error(`Durée invalide: ${value}`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNITS[unit];
}

module.exports = parseDuration;
