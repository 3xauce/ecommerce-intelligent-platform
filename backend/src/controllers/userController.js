const userModel = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const getMe = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) throw ApiError.notFound('Utilisateur introuvable');
  res.status(200).json(user);
});

const updateMe = asyncHandler(async (req, res) => {
  const { first_name: firstName, last_name: lastName } = req.body;
  const user = await userModel.updateProfile(req.user.id, { firstName, lastName });
  res.status(200).json(user);
});

const listUsers = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const users = await userModel.list({ limit, offset });
  res.status(200).json(users);
});

const updateUserRole = asyncHandler(async (req, res) => {
  const user = await userModel.updateRole(req.params.id, req.body.role);
  if (!user) throw ApiError.notFound('Utilisateur introuvable');
  res.status(200).json(user);
});

const updateUserStatus = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw ApiError.badRequest('Vous ne pouvez pas désactiver votre propre compte');
  }
  const user = await userModel.setActive(req.params.id, req.body.is_active);
  if (!user) throw ApiError.notFound('Utilisateur introuvable');
  res.status(200).json(user);
});

module.exports = { getMe, updateMe, listUsers, updateUserRole, updateUserStatus };
