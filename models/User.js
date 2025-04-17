const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: String,
  email: { type: String, unique: true },
  password: String,
  birthdate: Date,

  gender: { type: String, enum: ["M", "F"] }, // Seuls les valeurs "M" ou "F" sont valides
  sensitivity: {
    type: String,
    enum: [
      "frileux",
      "sensible au froid",
      "neutre",
      "le froid ne me dérange pas",
      "j'ai vite chaud",
      "résistant au froid",
    ],
  },

  accessories: [
    {
      type: String,
      enum: [
        "casquette",
        "bonnet",
        "écharpe",
        "gants",
        "sac à dos",
        "lunettes de soleil",
        "aucun",
      ], // Accessoires favoris
    },
  ],
  recommendationFrequency: {
    type: String,
    enum: [
      "Une tenue par jour",
      "Une tenue seulement si la météo change beaucoup",
      "Plusieurs suggestions pour choisir",
    ],
  }, // Correction : fermeture correcte de l'objet

  preferencesCompleted: { type: Boolean, default: false },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: "Child" }], // Référence aux enfants

  // Champs pour la réinitialisation du mot de passe
  resetToken: {
    type: String,
    default: null,
  },
  resetTokenExpiry: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model("User", userSchema);
