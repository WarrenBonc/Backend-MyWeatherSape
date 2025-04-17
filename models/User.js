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
      "Frileux",
      "Sensible au froid",
      "Neutre",
      "Le froid ne me dérange pas",
      "J'ai vite chaud",
      "Résistant au froid",
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
  expoPushToken: {
    type: String,
    default: null,
  },
  notificationTimes: [
    {
      type: String,
      enum: ["morning", "noon", "evening"],
    },
  ],
  notificationsEnabled: {
    type: Boolean,
    default: false,
  },
  notificationPreferences: {
    morning: { type: Boolean, default: false },
    noon: { type: Boolean, default: false },
    evening: { type: Boolean, default: false },
  },
});

module.exports = mongoose.model("User", userSchema);
