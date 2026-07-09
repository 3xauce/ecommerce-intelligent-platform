const authService = require('../services/authService');
const userModel = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const { email, password, first_name: firstName, last_name: lastName, role } = req.body;
  const { user, accessToken, refreshToken } = await authService.register({
    email,
    password,
    firstName,
    lastName,
    role,
  });
  res.status(201).json({ user: userModel.sanitize(user), accessToken, refreshToken });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login({ email, password });
  res.status(200).json({ user, accessToken, refreshToken });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refresh(refreshToken);
  res.status(200).json({
    user: userModel.sanitize(result.user),
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(refreshToken);
  res.status(204).send();
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res.status(200).json({ message: 'Si ce compte existe, un email a été envoyé.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  res.status(200).json({ message: 'Mot de passe mis à jour avec succès.' });
});

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword };
