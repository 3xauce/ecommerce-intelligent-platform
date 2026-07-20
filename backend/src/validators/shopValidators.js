const Joi = require('joi');

const shopSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(2000).allow('', null),
});

module.exports = { shopSchema };
