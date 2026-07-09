/**
 * Spécification OpenAPI 3.0 statique, mise à jour au fur et à mesure
 * que de nouveaux modules sont implémentés (voir backend/src/routes).
 */
const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'E-Commerce Intelligent Platform API',
    version: '1.0.0',
    description: 'API REST pour la plateforme e-commerce avec analyse concurrentielle IA',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'vendeur', 'client'] },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          is_active: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          slug: { type: 'string' },
          parent_id: { type: 'integer', nullable: true },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          price: { type: 'number' },
          stock: { type: 'integer' },
          category_id: { type: 'integer', nullable: true },
          vendor_id: { type: 'string', format: 'uuid' },
          images: { type: 'array', items: { type: 'string' } },
          is_active: { type: 'boolean' },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product_id: { type: 'string', format: 'uuid' },
                quantity: { type: 'integer' },
                unit_price: { type: 'number' },
                subtotal: { type: 'number' },
                stock_issue: { type: 'string', nullable: true },
              },
            },
          },
          total: { type: 'number' },
          item_count: { type: 'integer' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: "Vérifie l'état du serveur",
        responses: { 200: { description: 'OK' } },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Créer un compte utilisateur',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'first_name', 'last_name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                  role: { type: 'string', enum: ['vendeur', 'client'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Compte créé' },
          400: { description: 'Validation échouée', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Email déjà utilisé' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Connexion',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Connexion réussie, renvoie accessToken + refreshToken' },
          401: { description: 'Identifiants invalides' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: "Rafraîchir l'access token",
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Nouveau accessToken (et refreshToken en rotation)' },
          401: { description: 'Refresh token invalide, expiré ou révoqué' },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Révoquer un refresh token (déconnexion)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: { 204: { description: 'Déconnecté' } },
      },
    },
    '/auth/forgot-password': {
      post: {
        summary: 'Demander un email de réinitialisation de mot de passe',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Email envoyé si le compte existe' } },
      },
    },
    '/auth/reset-password': {
      post: {
        summary: 'Réinitialiser le mot de passe avec un token reçu par email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Mot de passe mis à jour' },
          400: { description: 'Token invalide ou expiré' },
        },
      },
    },
    '/users/me': {
      get: {
        summary: 'Profil de l’utilisateur connecté',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Profil utilisateur',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
        },
      },
      put: {
        summary: 'Mettre à jour son profil',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Profil mis à jour' } },
      },
    },
    '/users': {
      get: {
        summary: 'Lister les utilisateurs (admin uniquement)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Liste des utilisateurs' },
          403: { description: 'Rôle insuffisant' },
        },
      },
    },
    '/users/{id}/role': {
      put: {
        summary: "Changer le rôle d'un utilisateur (admin uniquement)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Rôle mis à jour' },
          403: { description: 'Rôle insuffisant' },
        },
      },
    },
    '/categories': {
      get: {
        summary: 'Lister les catégories',
        responses: {
          200: {
            description: 'Liste des catégories',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Category' } } } },
          },
        },
      },
      post: {
        summary: 'Créer une catégorie (admin uniquement)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Catégorie créée' }, 403: { description: 'Rôle insuffisant' } },
      },
    },
    '/categories/{id}': {
      get: {
        summary: 'Détail d’une catégorie',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Catégorie' }, 404: { description: 'Introuvable' } },
      },
      put: {
        summary: 'Modifier une catégorie (admin uniquement)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Catégorie mise à jour' } },
      },
      delete: {
        summary: 'Supprimer une catégorie (admin uniquement)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 204: { description: 'Supprimée' } },
      },
    },
    '/products': {
      get: {
        summary: 'Lister les produits (filtres: category_id, vendor_id, search, min_price, max_price, limit, offset)',
        parameters: [
          { name: 'category_id', in: 'query', schema: { type: 'integer' } },
          { name: 'vendor_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'min_price', in: 'query', schema: { type: 'number' } },
          { name: 'max_price', in: 'query', schema: { type: 'number' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: { 200: { description: 'Liste paginée de produits' } },
      },
      post: {
        summary: 'Créer un produit (vendeur/admin)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Produit créé' }, 403: { description: 'Rôle insuffisant' } },
      },
    },
    '/products/{id}': {
      get: {
        summary: 'Détail d’un produit',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Produit', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          404: { description: 'Introuvable' },
        },
      },
      put: {
        summary: 'Modifier un produit (propriétaire ou admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Produit mis à jour' }, 403: { description: 'Non propriétaire' } },
      },
      delete: {
        summary: 'Supprimer un produit (propriétaire ou admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 204: { description: 'Supprimé' }, 403: { description: 'Non propriétaire' } },
      },
    },
    '/products/{id}/images': {
      post: {
        summary: 'Uploader jusqu’à 5 images pour un produit (propriétaire ou admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { type: 'object', properties: { images: { type: 'array', items: { type: 'string', format: 'binary' } } } },
            },
          },
        },
        responses: { 201: { description: 'Images ajoutées' }, 400: { description: 'Fichier invalide' } },
      },
      delete: {
        summary: 'Retirer une image d’un produit (propriétaire ou admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string' } } } } },
        },
        responses: { 200: { description: 'Image retirée' } },
      },
    },
    '/cart': {
      get: {
        summary: 'Voir son panier',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Panier', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } } },
        },
      },
      delete: {
        summary: 'Vider son panier',
        security: [{ bearerAuth: [] }],
        responses: { 204: { description: 'Panier vidé' } },
      },
    },
    '/cart/items': {
      post: {
        summary: 'Ajouter un produit au panier (quantité cumulée si déjà présent)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['product_id'],
                properties: { product_id: { type: 'string', format: 'uuid' }, quantity: { type: 'integer', default: 1 } },
              },
            },
          },
        },
        responses: { 201: { description: 'Article ajouté' }, 400: { description: 'Stock insuffisant' } },
      },
    },
    '/cart/items/{productId}': {
      put: {
        summary: 'Fixer la quantité exacte d’un article du panier',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Panier mis à jour' }, 400: { description: 'Stock insuffisant' } },
      },
      delete: {
        summary: 'Retirer un article du panier',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Panier mis à jour' }, 404: { description: 'Article absent du panier' } },
      },
    },
  },
};

module.exports = openapiSpec;
