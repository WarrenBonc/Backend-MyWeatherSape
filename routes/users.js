var express = require("express");
var router = express.Router(); // Création d’un routeur Express
const verificationCodes = new Map();
const crypto = require("crypto"); //pour générer un token sécurisé lors de la reinitialisation du mdp
const nodemailer = require("nodemailer"); //Import de la bibliotheque nodemailer pour l envoie des mails
const User = require("../models/User"); // Import du modèle User
const bcrypt = require("bcrypt"); // Pour hasher les mots de passe
const jwt = require("jsonwebtoken"); // Pour créer les tokens JWT
const authenticateToken = require("../middlewares/auth");

// Signup route
router.post("/signup", (req, res) => {
  const { firstName, email, birthdate, password } = req.body; // Récupère les données envoyées par l'utilisateur

  // Vérifie si un champ est manquant ou vide

  if (
    !firstName ||
    !email ||
    !birthdate ||
    !password ||
    firstName.trim() === "" ||
    email.trim() === "" ||
    birthdate.trim() === "" ||
    password.trim() === ""
  ) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }
  if (isNaN(new Date(birthdate).getTime())) {
    // Vérifie si la date est valide
    return res.json({ result: false, error: "Invalid birthdate format" });
  }

  // Cherche si un utilisateur avec le même email existe déjà
  User.findOne({ email }).then((data) => {
    if (!data) {
      const hash = bcrypt.hashSync(password, 10);

      const newUser = new User({
        firstName,
        email,
        birthdate: new Date(birthdate),
        password: hash,
      });

      newUser.save().then((savedUser) => {
        const token = jwt.sign(
          { id: savedUser._id, email: savedUser.email }, // Utiliser `savedUser` au lieu de `data`
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        // Envoyer le token dans un cookie sécurisé
        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
        });

        res.json({
          result: true,
          userId: savedUser._id,
          preferencesCompleted: savedUser.preferencesCompleted, // Indique si le questionnaire est rempli
        });
      });
    } else {
      res.json({ result: false, error: "User already exists" });
      // Si un utilisateur existe déjà, on renvoie une erreur
    }
  });
});

// Signin route (connexion)
router.post("/signin", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password || email.trim() === "" || password.trim() === "") {
    return res.json({ result: false, error: "Missing or empty fields" });
  }

  User.findOne({ email }).then((data) => {
    if (data && bcrypt.compareSync(password, data.password)) {
      const token = jwt.sign(
        { id: data._id, email: data.email }, // Utiliser `data` au lieu de `savedUser`
        process.env.JWT_SECRET, // Clé secrète pour signer le token
        { expiresIn: "7d" } // Le token expire dans 7 jours
      );

      // Envoyer le token dans un cookie sécurisé
      res.cookie("token", token, {
        httpOnly: true, // Empêche l'accès au cookie via JavaScript côté client
        secure: process.env.NODE_ENV === "production", // Utilise HTTPS en production
        sameSite: "strict", // Empêche les attaques CSRF
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      });

      res.json({
        result: true,
        userId: data._id,
        preferencesCompleted: data.preferencesCompleted, // Inclure cette information
      });
    } else {
      res.json({ result: false, error: "User not found or wrong password" });
    }
  });
});

// Route pour valider le token et permettre la réinitialisation du mot de passe
router.post("/reset-password", authenticateToken, async (req, res) => {
  const { newPassword } = req.body; // Récupère le nouveau mot de passe depuis le corps de la requête

  // Vérifie que le nouveau mot de passe est présent et non vide
  if (!newPassword || newPassword.trim() === "") {
    return res
      .status(400)
      .json({ success: false, message: "Nouveau mot de passe requis" });
  }

  try {
    // Récupérer l'utilisateur à partir des informations ajoutées par le middleware
    const user = await User.findById(req.user.userid);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Utilisateur non trouvé" });
    }

    // Hashage du nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mise à jour du mot de passe
    user.password = hashedPassword;

    // Enregistrer les modifications dans la base de données
    await user.save();

    res.json({
      result: true,
      message: "Mot de passe réinitialisé avec succès",
    });
  } catch (error) {
    console.error(
      "Erreur lors de la réinitialisation du mot de passe :",
      error
    );
    res
      .status(500)
      .json({ success: false, message: "Erreur interne du serveur" });
  }
});

// Logout route
router.get("/logout", (req, res) => {
  // Supprimer le cookie contenant le token
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.json({
    result: true,
    message: "Déconnexion réussie. Le cookie a été supprimé.",
  });
});

// route pour ajouter les preferences de l'utilisateur
router.post("/update-preferences", authenticateToken, async (req, res) => {
  const { preferences } = req.body;
  const { gender, sensitivity, accessories, recommendationFrequency } =
    preferences || {};

  try {
    const user = await User.findById(req.user.id); // Utiliser l'ID utilisateur depuis le token
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Mettre à jour les préférences de l'utilisateur
    user.gender = gender;
    user.sensitivity = sensitivity;
    user.accessories = accessories;
    user.recommendationFrequency = recommendationFrequency;

    await user.save();

    res.json({
      success: true,
      message: "Préférences mises à jour avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour des préférences :", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

router.post("/complete-preferences", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    user.preferencesCompleted = true; // Marquer le questionnaire comme terminé
    await user.save();

    res.json({ success: true, message: "Préférences complétées avec succès" });
  } catch (error) {
    console.error("Erreur lors de la mise à jour des préférences :", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

router.get("/verify-token", authenticateToken, (req, res) => {
  try {
    // Si le middleware `authenticateToken` passe, le token est valide
    res.json({ valid: true, user: req.user });
  } catch (error) {
    console.error("Erreur lors de la vérification du token :", error);
    res
      .status(401)
      .json({ valid: false, message: "Token invalide ou expiré." });
  }
});

router.post("/send-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error(
        "❌ Configuration d'email manquante (EMAIL_USER ou EMAIL_PASS)"
      );
      return res.status(500).json({ message: "Configuration email manquante" });
    }

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // const user = await User.findOne({ email });

    // if (!user) {
    //   return res.status(404).json({ message: "User not found" });
    // }

    // Générer un code de vérification à 5 chiffres
    const verificationCode = crypto.randomInt(10000, 99999).toString();

    // Stocker le code avec une expiration (5 minutes)
    verificationCodes.set(email, {
      code: verificationCode,
      expiresAt: Date.now() + 5 * 60 * 1000, // Expire dans 5 minutes
    });

    let transporter;
    try {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } catch (error) {
      console.error("Erreur de configuration du transporteur :", error);
      return res.status(500).json({ message: "Erreur de configuration email" });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Réinitialisation de mot de passe",
      html: `<h1>Votre code de vérification est : <span style="color:blue; text-decoration: underline;" >${verificationCode}</span></h1>
             <p>Ce code expirera dans 5 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ Email de réinitialisation envoyé à ${email}`);
    res
      .status(200)
      .json({ message: "Verification code sent successfully", result: true });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Failed to send email", error });
  }
});

router.post("/verify-code", (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ message: "Code is required" });
  }

  // Rechercher l'email associé au code
  const email = [...verificationCodes.keys()].find(
    (key) => verificationCodes.get(key).code === code
  );

  if (!email) {
    return res
      .status(404)
      .json({ message: "Invalid or expired verification code" });
  }

  const storedCode = verificationCodes.get(email);

  if (storedCode.expiresAt < Date.now()) {
    verificationCodes.delete(email); // Supprimer le code expiré
    return res.status(400).json({ message: "Verification code has expired" });
  }

  // Code valide
  verificationCodes.delete(email); // Supprimer le code après vérification réussi

  User.findOne({ email }).then((data) => {
    const UserId = data._id;
    const resetToken = jwt.sign(
      { userid: UserId, email: data.email }, // Utiliser `data` au lieu de `savedUser`
      process.env.JWT_SECRET, // Clé secrète pour signer le token
      { expiresIn: "1h" } // Le token expire dans 1 heure
    );

    // Envoyer le token dans un cookie sécurisé
    res.cookie("token", resetToken, {
      httpOnly: true, // Empêche l'accès au cookie via JavaScript côté client
      secure: process.env.NODE_ENV === "production", // Utilise HTTPS en production
      sameSite: "strict", // Empêche les attaques CSRF
      maxAge: 60 * 60 * 1000, // 1 heure
    });

    res.json({
      result: true,
      userId: data._id,
    });
  });
});

// Route pour récupérer les préférences utilisateur
router.get("/preferences", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json({
      gender: user.gender || null,
      sensitivity: user.sensitivity || null,
      accessories: user.accessories || [],
      recommendationFrequency: user.recommendationFrequency || null,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des préférences :", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

// route pour ajouter un enfant
router.post("/add-child", authenticateToken, async (req, res) => {
  try {
    const { firstName, gender, dressing } = req.body;

    // Validation des champs obligatoires
    if (!firstName || !gender) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    // Récupérer l'utilisateur connecté
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Créer un nouvel enfant basé sur le sous-schéma
    const child = {
      name: firstName,
      gender: gender,
      dressing: dressing || [], // Par défaut, aucun vêtement
    };

    // Ajouter l'enfant au tableau `children`
    user.children.push(child);

    // Sauvegarder les modifications
    await user.save();

    res.json({ message: "Enfant ajouté avec succès", child });
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'enfant :", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

//route pour recuperer les enfants de l'utilisateur, les enfants sont stockés dans le tableau children de l'utilisateur
router.get("/children", authenticateToken, async (req, res) => {
  try {
    // Récupérer l'utilisateur connecté
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Retourner la liste des enfants
    res.json({ children: user.children });
  } catch (error) {
    console.error("Erreur lors de la récupération des enfants :", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

// Route pour supprimer un enfant
router.delete("/remove-child", authenticateToken, async (req, res) => {
  try {
    const { childId } = req.body;

    // Vérifier si l'ID de l'enfant est fourni
    if (!childId) {
      return res.status(400).json({ message: "ID de l'enfant manquant." });
    }

    // Récupérer l'utilisateur connecté
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Trouver et supprimer l'enfant du tableau `children`
    const childIndex = user.children.findIndex(
      (child) => child._id.toString() === childId
    );

    if (childIndex === -1) {
      return res.status(404).json({ message: "Enfant non trouvé." });
    }

    user.children.splice(childIndex, 1); // Supprimer l'enfant du tableau

    // Sauvegarder les modifications
    await user.save();

    res.json({ message: "Enfant supprimé avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'enfant :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

module.exports = router;
