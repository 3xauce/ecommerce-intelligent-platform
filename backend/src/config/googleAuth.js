const { OAuth2Client } = require('google-auth-library');

let client = null;

function isConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID);
}

/**
 * Vérifie un ID token Google (Google Identity Services) et renvoie le
 * payload (email, given_name, family_name, sub...). Lève une erreur claire
 * si GOOGLE_CLIENT_ID n'est pas configuré.
 */
async function verifyGoogleCredential(credential) {
  if (!isConfigured()) {
    const error = new Error('Connexion Google non configurée (GOOGLE_CLIENT_ID manquant)');
    error.code = 'GOOGLE_NOT_CONFIGURED';
    throw error;
  }

  if (!client) {
    client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

module.exports = { verifyGoogleCredential, isConfigured };
