const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: String,
  email: { type: String, unique: true },
  password: String,
  birthdate: Date,

  gender: String, // Suppression de l'enum pour le genre
  sensitivity: String, // Suppression de l'enum pour la sensibilité
  accessories: [String], // Suppression de l'enum pour les accessoires
  recommendationFrequency: String, // Suppression de l'enum pour la fréquence des recommandations

  preferencesCompleted: { type: Boolean, default: false },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: "Child" }], // Référence aux enfants

  expoPushToken: {
    type: String,
    default: null,
  },
  notificationTimes: [String], // Suppression de l'enum pour les heures de notification
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
