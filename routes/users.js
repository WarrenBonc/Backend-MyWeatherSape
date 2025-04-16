var express = require('express');
var router = express.Router(); // Création d’un routeur Express

const crypto = require('crypto'); //pour générer un token sécurisé lors de la reinitialisation du mdp
const nodemailer = require('nodemailer'); //Import de la bibliotheque nodemailer pour l envoie des mails
const User = require('../models/User'); // Import du modèle User
const bcrypt = require('bcrypt'); // Pour hasher les mots de passe
const jwt = require('jsonwebtoken'); // Pour créer les tokens JWT

const JWT_SECRET = process.env.JWT_SECRET; // Clé secrète pour signer les tokens (à stocker dans .env en prod)


// Signup route
router.post('/signup', (req, res) => {
  const { firstName, email, birthdate, password } = req.body; // Récupère les données envoyées par l'utilisateur

 // Vérifie si un champ est manquant ou vide

  if (!firstName || !email || !birthdate || !password ||
      firstName.trim() === '' || email.trim() === '' ||           
      birthdate.trim() === '' || password.trim() === '') {
    res.json({ result: false, error: 'Missing or empty fields' });
    return;
  }
  if (isNaN(new Date(birthdate).getTime())) {
    // Vérifie si la date est valide
    return res.json({ result: false, error: 'Invalid birthdate format' });
  }

  // Cherche si un utilisateur avec le même email existe déjà
  User.findOne({ email }).then(data => {
    if (!data) {
      const hash = bcrypt.hashSync(password, 10);

      const newUser = new User({
        firstName,
        email,
        birthdate: new Date(birthdate),
        password: hash,
        
      });

      newUser.save().then(savedUser => {
        // Crée un token JWT

        const token = jwt.sign(
          { id: savedUser._id, firstName: savedUser.firstName },
          process.env.JWT_SECRET,  // Utilise la clé secrète dans le .env
          { expiresIn: '7d' } // Le token expire dans 7 jours
        );

        res.json({ result: true, token, userId: savedUser._id });
        // Renvoie le token et l'id utilisateur
      });
    } else {
      res.json({ result: false, error: 'User already exists' });
      // Si un utilisateur existe déjà, on renvoie une erreur
    }
  });
});

// Signin route (connexion)

router.post('/signin', (req, res) => {
  const { email, password } = req.body; // Récupère email et mot de passe


// Vérifie que les champs ne sont pas vides
  if (!email || !password || email.trim() === '' || password.trim() === '') {
    res.json({ result: false, error: 'Missing or empty fields' });
    return;
  }

// Recherche l'utilisateur dans la BDD
  User.findOne({ email }).then(data => {
    if (data && bcrypt.compareSync(password, data.password)) {
      // Si l'utilisateur est trouvé et que le mot de passe correspond

      const token = jwt.sign(
        { id: data._id, firstName: data.firstName },
        JWT_SECRET,
        { expiresIn: '7d' } // Durée de validité du token
      );

      res.json({ result: true, token, userId: data._id });
      // On renvoie le token et l’ID utilisateur
    } else {
      res.json({ result: false, error: 'User not found or wrong password' });
      // Si mauvais mot de passe ou utilisateur introuvable
    }
  });
});

//route pour la réinitialisation du mot de passe

router.post('/forgot-password', async (req, res) => {

const { email } = req.body;

// Validation de l'email
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
if (!email || !emailRegex.test(email.trim())) {
  return res.json({ success: false, message: 'Email invalide' });
}

// Vérification si l'email est renseigné

  if (!email || email.trim() === '') {
    return res.json({ success: false, message: 'Email requis' });
  }

  // Recherche de l'utilisateur dans la base de données

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ success: false, message: 'Utilisateur non trouvé' });
  }

  // Générer un token temporaire unique
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = Date.now() + 1000 * 60 * 60; // 1 heure

  // Enregistrer le token dans le user
  user.resetToken = resetToken;
  user.resetTokenExpiry = resetTokenExpiry;
  await user.save();

  // Créer un transporteur pour envoyer l'email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure:true,
    auth: {
      user: process.env.MAIL_USER,       // à définir dans ton .env
      pass: process.env.MAIL_PASSWORD,   // idem
    },
  });

  const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

  const mailOptions = {
    from: process.env.MAIL_USER,
    to: user.email,
    subject: 'Réinitialisation de mot de passe',
    html: `<p>Bonjour ${user.firstName},</p>
           <p>Cliquez sur le lien suivant pour réinitialiser votre mot de passe :</p>
           <a href="${resetLink}">${resetLink}</a>
           <p>Ce lien expirera dans 1 heure.</p>`,
  };

  console.log("=== Envoi email ===");
console.log("À :", user.email);
console.log("MAIL_USER:", process.env.MAIL_USER);
console.log("MAIL_PASSWORD:", process.env.MAIL_PASSWORD ? 'OK' : 'MANQUANT');

// Tentative d'envoi de l'email
  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Email envoyé avec succès' });
  } catch (error) {
    console.error("Erreur d'envoi de mail:", error);
    if (error.response) {
      console.error("Réponse SMTP:", error.response);
    }
    res.status(500).json({ success: false, message: 'Erreur lors de l’envoi de l’email' });
  }
});

// Route pour valider le token et permettre la réinitialisation du mot de passe
router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: Date.now() } });

  if (!user) {
    return res.json({ success: false, message: 'Token invalide ou expiré' });
  }

  res.json({ success: true, message: 'Token valide, vous pouvez réinitialiser votre mot de passe' });
});



//Route POST pour finaliser la réinitialisation du mot de passe avec un token

router.post('/reset-password/:token', async (req, res) => {

  const { token } = req.params;         // Récupère le token dans l'URL
  const { newPassword } = req.body;     // Récupère le nouveau mot de passe depuis le corps de la requête


// Vérifie que le nouveau mot de passe est présent et non vide
  if (!newPassword || newPassword.trim() === '') {
    return res.json({ success: false, message: 'Nouveau mot de passe requis' });
  }

  // Recherche un utilisateur avec le token correspondant et non expiré
  const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() } }); // Vérifie que le token n'est pas expiré


// Si aucun utilisateur n'est trouvé ou que le token est expiré
  if (!user) {
    return res.json({ success: false, message: 'Token invalide ou expiré' });  
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);  // Hashage du nouveau mot de passe avec bcrypt (niveau de sécurité : 10)

  user.password = hashedPassword;  // Met à jour le mot de passe de l'utilisateur

// Supprime le token et sa date d’expiration (plus nécessaires après réinitialisation)
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;

  await user.save(); // Enregistre les changements dans la base de données

  res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });  // Réponse envoyée au client : succès
});

// Logout route
router.get('/logout', (req, res) => {
 res.json({ result: true, message: 'Logout successful (please remove token from client storage)' });
});


module.exports = router;
