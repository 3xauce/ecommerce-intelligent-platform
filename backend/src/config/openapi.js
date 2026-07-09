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
  },
};

module.exports = openapiSpec;
