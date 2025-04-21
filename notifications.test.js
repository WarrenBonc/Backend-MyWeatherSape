// On importe supertest pour simuler les requêtes HTTP vers notre backend
const request = require('supertest');
// On importe l'application Express
const app = require('./app');

// --------- TEST DE LA CONNEXION ---------
describe('POST /api/users/signin', () => {
  it('devrait se connecter avec succès avec des identifiants valides', async () => {
    // On simule une connexion avec les bons identifiants
    const res = await request(app)
      .post('/api/users/signin')
      .send({
        email: 'pbuis69@gmail.com',
        password: 'test1234', 
      });

    // On s'attend à recevoir un code 200 et un objet contenant les infos de l'utilisateur
    expect(res.statusCode).toBe(200);
    expect(res.body.result).toBe(true);
    expect(res.body).toHaveProperty('userId');
    expect(res.body).toHaveProperty('preferencesCompleted');
  });

  it('devrait échouer avec un mot de passe incorrect', async () => {
    // On teste avec un mauvais mot de passe
    const res = await request(app)
      .post('/api/users/signin')
      .send({
        email: 'pbuis69@gmail.com',
        password: 'mauvaismdp',
      });

    // On s'attend à ce que la connexion échoue (result = false)
    expect(res.statusCode).toBe(200);
    expect(res.body.result).toBe(false);
    expect(res.body).toHaveProperty('error');
  });
});

// --------- RÉCUPÉRATION DU TOKEN AVANT LES AUTRES TESTS ---------
let authCookie;

beforeAll(async () => {
  // On se connecte pour récupérer le cookie d'authentification
  const res = await request(app)
    .post('/api/users/signin')
    .send({
      email: 'pbuis69@gmail.com',
      password: 'test1234',
    });

  // On récupère le cookie contenant le token
  authCookie = res.headers['set-cookie'].find(cookie => cookie.startsWith('token='));
});

// --------- TEST DE LA SAUVEGARDE DES PRÉFÉRENCES NOTIFICATIONS ---------
describe('POST /api/notifications/save-preferences', () => {
  it('devrait enregistrer les préférences de notification', async () => {
    // On envoie une requête avec le token récupéré pour sauvegarder les préférences
    const res = await request(app)
      .post('/api/notifications/save-preferences')
      .set('Cookie', [authCookie])
      .send({
        preferences: {
          notificationsEnabled: true,
          notificationPreferences: ['matin'],
        },
      });

    // On s'attend à une réponse positive et à ce que les valeurs soient bien enregistrées
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Préférences mises à jour');
    expect(res.body.user).toHaveProperty('notificationsEnabled', true);
    expect(res.body.user.notificationPreferences).toEqual(expect.arrayContaining(['matin']));
  });
});
