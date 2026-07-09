const request = require('supertest');

jest.mock('../src/config/db', () => require('./fakeDb'));

const fakeDb = require('./fakeDb');
const app = require('../src/app');

beforeEach(() => {
  fakeDb.__reset();
});

describe('POST /api/auth/register', () => {
  it('crée un compte et renvoie des tokens', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'jean@example.com',
      password: 'Password123',
      first_name: 'Jean',
      last_name: 'Dupont',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('jean@example.com');
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
  });

  it('refuse un email déjà utilisé (409)', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'jean@example.com',
      password: 'Password123',
      first_name: 'Jean',
      last_name: 'Dupont',
    });

    const res = await request(app).post('/api/auth/register').send({
      email: 'jean@example.com',
      password: 'Autre12345',
      first_name: 'Jean2',
      last_name: 'Dupont2',
    });

    expect(res.status).toBe(409);
  });

  it('refuse un mot de passe trop court (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'jean2@example.com',
      password: 'short',
      first_name: 'Jean',
      last_name: 'Dupont',
    });

    expect(res.status).toBe(400);
    expect(res.body.details).toBeInstanceOf(Array);
  });

  it("ignore une tentative d'auto-inscription en admin (rôle non autorisé au register)", async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'hacker@example.com',
      password: 'Password123',
      first_name: 'H',
      last_name: 'K',
      role: 'admin',
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'marie@example.com',
      password: 'Password123',
      first_name: 'Marie',
      last_name: 'Curie',
    });
  });

  it('connecte un utilisateur avec les bons identifiants', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'marie@example.com', password: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('marie@example.com');
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('refuse un mauvais mot de passe (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'marie@example.com', password: 'MauvaisMdp' });

    expect(res.status).toBe(401);
  });

  it('refuse un email inconnu (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inconnu@example.com', password: 'Password123' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('renvoie un nouveau couple de tokens et révoque l’ancien refresh token', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      email: 'paul@example.com',
      password: 'Password123',
      first_name: 'Paul',
      last_name: 'Martin',
    });
    const { refreshToken } = registerRes.body;

    const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toEqual(expect.any(String));
    expect(refreshRes.body.refreshToken).not.toBe(refreshToken);

    // L'ancien refresh token ne doit plus être utilisable (rotation)
    const reuseRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(reuseRes.status).toBe(401);
  });

  it('refuse un refresh token inconnu (401)', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'token-inexistant' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('révoque le refresh token', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      email: 'sophie@example.com',
      password: 'Password123',
      first_name: 'Sophie',
      last_name: 'Bernard',
    });
    const { refreshToken } = registerRes.body;

    const logoutRes = await request(app).post('/api/auth/logout').send({ refreshToken });
    expect(logoutRes.status).toBe(204);

    const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });
});

describe('GET /api/users/me', () => {
  it('refuse une requête sans token (401)', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('renvoie le profil avec un token valide', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      email: 'luc@example.com',
      password: 'Password123',
      first_name: 'Luc',
      last_name: 'Petit',
    });
    const { accessToken } = registerRes.body;

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('luc@example.com');
  });

  it('refuse un accès admin pour un client (403)', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      email: 'client@example.com',
      password: 'Password123',
      first_name: 'C',
      last_name: 'L',
    });
    const { accessToken } = registerRes.body;

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/auth/forgot-password + reset-password', () => {
  it('permet de réinitialiser le mot de passe et invalide les anciens refresh tokens', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      email: 'alice@example.com',
      password: 'Password123',
      first_name: 'Alice',
      last_name: 'Wonder',
    });
    const { refreshToken } = registerRes.body;

    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'alice@example.com' });
    expect(forgotRes.status).toBe(200);

    // Le token de reset n'est pas renvoyé par l'API (il part par email) :
    // on le récupère directement depuis le store en mémoire pour le test.
    const bcrypt = require('bcrypt');
    void bcrypt; // (aucune dépendance directe, juste documentation du flux)

    // On simule le flux complet via le module réel plutôt que de deviner le token.
    const tokenService = require('../src/services/tokenService');
    const tokenModel = require('../src/models/tokenModel');
    const user = fakeDb.__users().find((u) => u.email === 'alice@example.com');

    // Génère un nouveau token de reset connu pour le test
    const crypto = require('crypto');
    const plainToken = crypto.randomBytes(16).toString('hex');
    await tokenModel.storePasswordResetToken({
      userId: user.id,
      tokenHash: tokenService.hashToken(plainToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: plainToken, password: 'NouveauMdp123' });
    expect(resetRes.status).toBe(200);

    // L'ancien mot de passe ne fonctionne plus
    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'Password123' });
    expect(oldLogin.status).toBe(401);

    // Le nouveau mot de passe fonctionne
    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'NouveauMdp123' });
    expect(newLogin.status).toBe(200);

    // Les anciens refresh tokens ont été révoqués par le reset
    const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });

  it('ne révèle pas si un email existe (toujours 200)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'inexistant@example.com' });
    expect(res.status).toBe(200);
  });
});
