const Joi = require('joi');

const createProductSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().allow('', null),
  price: Joi.number().positive().precision(2).required(),
  stock: Joi.number().integer().min(0).default(0),
  category_id: Joi.number().integer().allow(null),
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().allow('', null),
  price: Joi.number().positive().precision(2).required(),
  stock: Joi.number().integer().min(0).required(),
  category_id: Joi.number().integer().allow(null),
  is_active: Joi.boolean().default(true),
});

const listProductsQuerySchema = Joi.object({
  category_id: Joi.number().integer(),
  vendor_id: Joi.string().uuid(),
  search: Joi.string().max(255),
  min_price: Joi.number().min(0),
  max_price: Joi.number().min(0),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

module.exports = { createProductSchema, updateProductSchema, listProductsQuerySchema };
