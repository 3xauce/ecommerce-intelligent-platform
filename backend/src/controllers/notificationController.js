const notificationModel = require('../models/notificationModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const listNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  const result = await notificationModel.listByUser(req.user.id, { limit, offset });
  res.status(200).json(result);
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationModel.markRead(req.params.id, req.user.id);
  if (!notification) throw ApiError.notFound('Notification introuvable');
  res.status(200).json(notification);
});

const markAllRead = asyncHandler(async (req, res) => {
  await notificationModel.markAllRead(req.user.id);
  res.status(204).send();
});

module.exports = { listNotifications, markRead, markAllRead };
