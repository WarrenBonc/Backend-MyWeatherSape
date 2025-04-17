const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token; // Récupérer le token depuis les cookies

  if (!token) {
    return res
      .status(401)
      .json({ message: "Accès non autorisé. Token manquant." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // Vérifier et décoder le token
    req.user = decoded; // Ajouter les informations utilisateur à la requête
    next(); // Passer au middleware suivant ou à la route
  } catch (error) {
    return res.status(403).json({ message: "Token invalide ou expiré." });
  }
};

module.exports = authenticateToken;
