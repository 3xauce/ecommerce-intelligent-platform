const bcrypt = require('bcrypt');
const request = require('supertest');
const userModel = require('../src/models/userModel');

/**
 * Crée un utilisateur directement en base (contourne /auth/register qui
 * interdit l'auto-inscription en admin) puis se connecte pour récupérer un
 * accessToken utilisable dans les tests.
 */
async function createUserWithRole(app, role, email) {
  const password = 'Password123';
  const passwordHash = await bcrypt.hash(password, 4);
  const user = await userModel.create({
    email,
    passwordHash,
    role,
    firstName: 'Test',
    lastName: role,
  });
  const loginRes = await request(app).post('/api/auth/login').send({ email, password });
  return { user, accessToken: loginRes.body.accessToken };
}

module.exports = { createUserWithRole };
