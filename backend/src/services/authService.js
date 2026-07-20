const bcrypt = require('bcrypt');
const crypto = require('crypto');
const userModel = require('../models/userModel');
const tokenModel = require('../models/tokenModel');
const tokenService = require('../services/tokenService');
const parseDuration = require('../utils/parseDuration');
const { sendEmail } = require('../utils/email');
const { verifyGoogleCredential } = require('../config/googleAuth');
const ApiError = require('../utils/ApiError');

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL = '1h';

async function register({ email, password, firstName, lastName, role }) {
  const existing = await userModel.findByEmail(email);
  if (existing) {
    throw ApiError.conflict('Un compte existe déjà avec cet email');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userModel.create({
    email,
    passwordHash,
    role: role || 'client',
    firstName,
    lastName,
  });

  const tokens = await tokenService.issueTokenPair(user);
  return { user, ...tokens };
}

/**
 * Connexion / inscription via Google Identity Services. L'email vérifié par
 * Google fait foi : si un compte existe on le connecte, sinon on le crée
 * (rôle client, changeable ensuite par un admin). Un mot de passe aléatoire
 * est stocké pour respecter le schéma — inutilisable tel quel, l'utilisateur
 * peut définir le sien via "mot de passe oublié".
 */
async function googleAuth({ credential, role }) {
  let payload;
  try {
    payload = await verifyGoogleCredential(credential);
  } catch (err) {
    if (err.code === 'GOOGLE_NOT_CONFIGURED') {
      throw new ApiError(503, err.message);
    }
    throw ApiError.unauthorized('Jeton Google invalide ou expiré');
  }

  if (!payload?.email || payload.email_verified === false) {
    throw ApiError.unauthorized('Email Google non vérifié');
  }

  let user = await userModel.findByEmail(payload.email);
  let created = false;

  if (!user) {
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, SALT_ROUNDS);
    user = await userModel.create({
      email: payload.email,
      passwordHash,
      role: role === 'vendeur' ? 'vendeur' : 'client',
      firstName: payload.given_name || payload.name || 'Utilisateur',
      lastName: payload.family_name || 'Google',
    });
    created = true;
  } else if (!user.is_active) {
    throw ApiError.unauthorized('Compte désactivé');
  }

  const tokens = await tokenService.issueTokenPair(user);
  return { user: userModel.sanitize(user), created, ...tokens };
}

async function login({ email, password }) {
  const user = await userModel.findByEmail(email);
  if (!user || !user.is_active) {
    throw ApiError.unauthorized('Identifiants invalides');
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw ApiError.unauthorized('Identifiants invalides');
  }

  const tokens = await tokenService.issueTokenPair(user);
  return { user: userModel.sanitize(user), ...tokens };
}

async function refresh(refreshTokenPlain) {
  const record = await tokenService.consumeRefreshToken(refreshTokenPlain);
  if (!record) {
    throw ApiError.unauthorized('Refresh token invalide, expiré ou révoqué');
  }

  const user = await userModel.findById(record.user_id);
  if (!user || !user.is_active) {
    throw ApiError.unauthorized('Compte introuvable ou désactivé');
  }

  const tokens = await tokenService.issueTokenPair(user);
  return { user, ...tokens };
}

async function logout(refreshTokenPlain) {
  await tokenService.revokeRefreshToken(refreshTokenPlain);
}

async function forgotPassword(email) {
  const user = await userModel.findByEmail(email);
  // On ne révèle jamais si l'email existe ou non (anti énumération de comptes)
  if (!user) return;

  const plainToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + parseDuration(RESET_TOKEN_TTL));

  await tokenModel.storePasswordResetToken({
    userId: user.id,
    tokenHash: tokenService.hashToken(plainToken),
    expiresAt,
  });

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${plainToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Réinitialisation de votre mot de passe',
    text: `Réinitialisez votre mot de passe ici : ${resetUrl} (valable 1h)`,
  });
}

async function resetPassword(plainToken, newPassword) {
  const tokenHash = tokenService.hashToken(plainToken);
  const record = await tokenModel.findValidPasswordResetToken(tokenHash);
  if (!record) {
    throw ApiError.badRequest('Token de réinitialisation invalide ou expiré');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userModel.updatePassword(record.user_id, passwordHash);
  await tokenModel.markPasswordResetTokenUsed(record.id);
  await tokenModel.revokeAllUserRefreshTokens(record.user_id);
}

module.exports = { register, googleAuth, login, refresh, logout, forgotPassword, resetPassword };
