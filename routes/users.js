var express = require('express');
var router = express.Router(); // Création d’un routeur Express


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

// Logout route
router.get('/logout', (req, res) => {
 res.json({ result: true, message: 'Logout successful (please remove token from client storage)' });
});


module.exports = router;
