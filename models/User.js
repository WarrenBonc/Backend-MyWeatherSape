const mongoose = require("mongoose");

// Sous-schema pour un vêtement
const clothingItemSchema = new mongoose.Schema({
  label: String, // ex: "T-shirt noir"
  category: {
    haut: String,
    bas: String,
    accessories: String,
  },
  forChild: { type: Boolean, default: false }
});

// Sous-schema pour un enfant
const childSchema = new mongoose.Schema({
  name: String,
  gender: { type: String, enum: ['M', 'F'] },
  ageGroup: { type: String, enum: ['bébé', 'enfant', 'ado'] },
  dressing: [clothingItemSchema], // Sous-documents vêtements
});


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
  children: [childSchema], // Référence aux enfants

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
