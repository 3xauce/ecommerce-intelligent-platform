const Joi = require('joi');

const magicCompareSchema = Joi.object({
  url: Joi.string().uri({ scheme: ['http', 'https'] }).max(500).required(),
});

module.exports = { magicCompareSchema };
