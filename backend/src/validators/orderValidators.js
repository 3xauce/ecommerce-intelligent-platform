const Joi = require('joi');

const checkoutSchema = Joi.object({
  currency: Joi.string().valid('usd', 'eur').default('usd'),
  shipping_address: Joi.object().unknown(true).allow(null),
});

const listOrdersQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

module.exports = { checkoutSchema, listOrdersQuerySchema };
