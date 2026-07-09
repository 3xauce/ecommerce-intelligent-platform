const ApiError = require('../utils/ApiError');

/**
 * Valide req[source] contre un schéma Joi.
 * Rejette avec un 400 détaillé plutôt que de laisser passer des données invalides.
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((d) => d.message);
    return next(ApiError.badRequest('Validation échouée', details));
  }

  req[source] = value;
  return next();
};

module.exports = validate;
