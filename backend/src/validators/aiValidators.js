const Joi = require('joi');

const magicCompareSchema = Joi.object({
  url: Joi.string().uri({ scheme: ['http', 'https'] }).max(500).required(),
});

const chatbotSchema = Joi.object({
  message: Joi.string().min(1).max(500).required(),
});

module.exports = { magicCompareSchema, chatbotSchema };
