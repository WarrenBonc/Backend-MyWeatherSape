const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  //essentiels
  lastName: String,
  firstName: String,
  email: { type: String, unique: true },
  password: String,
  birthdate: Date,
  gender: String, // Suppression de l'enum pour le genre
  sensitivity: String, // Suppression de l'enum pour la sensibilité
  accessories: [String], // Suppression de l'enum pour les accessoires
  preferencesCompleted: { type: Boolean, default: false },
  // non essentiels enfants, garderobe, notifications

  notificationTimes: [String], // Suppression de l'enum pour les heures de notification
  notificationsEnabled: {
    type: Boolean,
    default: false,
  },
  notificationPreferences: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("User", userSchema);
