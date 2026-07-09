const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Header Authorization manquant ou invalide'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch (err) {
    return next(ApiError.unauthorized('Token invalide ou expiré'));
  }
};

/**
 * Décode le token si présent, sans jamais rejeter la requête. Utile pour les
 * routes publiques dont le comportement varie légèrement si l'appelant est
 * authentifié (ex: voir ses propres produits inactifs).
 */
const optionalAuthenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
  } catch (err) {
    // Token invalide sur une route publique : on l'ignore simplement.
  }
  return next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized());
  }
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden('Rôle insuffisant pour cette action'));
  }
  return next();
};

module.exports = { authenticate, optionalAuthenticate, requireRole };
