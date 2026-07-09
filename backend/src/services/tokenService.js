const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const parseDuration = require('../utils/parseDuration');
const tokenModel = require('../models/tokenModel');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

async function issueRefreshToken(userId) {
  const plainToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(
    Date.now() + parseDuration(process.env.JWT_REFRESH_EXPIRES_IN || '7d')
  );
  await tokenModel.storeRefreshToken({
    userId,
    tokenHash: hashToken(plainToken),
    expiresAt,
  });
  return plainToken;
}

async function issueTokenPair(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);
  return { accessToken, refreshToken };
}

async function consumeRefreshToken(plainToken) {
  const tokenHash = hashToken(plainToken);
  const record = await tokenModel.findValidRefreshToken(tokenHash);
  if (!record) return null;
  await tokenModel.revokeRefreshToken(tokenHash);
  return record;
}

async function revokeRefreshToken(plainToken) {
  await tokenModel.revokeRefreshToken(hashToken(plainToken));
}

module.exports = {
  hashToken,
  generateAccessToken,
  issueRefreshToken,
  issueTokenPair,
  consumeRefreshToken,
  revokeRefreshToken,
};
