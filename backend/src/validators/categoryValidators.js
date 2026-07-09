const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  parent_id: Joi.number().integer().allow(null),
});

const updateCategorySchema = createCategorySchema;

module.exports = { createCategorySchema, updateCategorySchema };
