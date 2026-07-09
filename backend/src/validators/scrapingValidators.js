const Joi = require('joi');

// Le spider générique a besoin de sélecteurs CSS pour trouver les produits ;
// WooCommerce et Shopify utilisent des sélecteurs/endpoints standards.
const cssSelectorsSchema = Joi.object({
  product: Joi.string().required(),
  name: Joi.string().required(),
  price: Joi.string().required(),
  link: Joi.string(),
  next_page: Joi.string(),
  render_js: Joi.boolean(),
}).unknown(true);

const createStoreSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  url: Joi.string().uri({ scheme: ['http', 'https'] }).max(500).required(),
  platform: Joi.string().valid('woocommerce', 'shopify', 'generic').required(),
  css_selectors: Joi.when('platform', {
    is: 'generic',
    then: cssSelectorsSchema.required(),
    otherwise: cssSelectorsSchema.optional().allow(null),
  }),
});

const updateStoreSchema = createStoreSchema.keys({
  is_active: Joi.boolean().default(true),
});

const listScrapedQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

module.exports = { createStoreSchema, updateStoreSchema, listScrapedQuerySchema };
