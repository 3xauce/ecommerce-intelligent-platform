const Joi = require('joi');

const updateProfileSchema = Joi.object({
  first_name: Joi.string().min(1).max(100).required(),
  last_name: Joi.string().min(1).max(100).required(),
});

const updateRoleSchema = Joi.object({
  role: Joi.string().valid('admin', 'vendeur', 'client').required(),
});

const updateStatusSchema = Joi.object({
  is_active: Joi.boolean().required(),
});

module.exports = { updateProfileSchema, updateRoleSchema, updateStatusSchema };
