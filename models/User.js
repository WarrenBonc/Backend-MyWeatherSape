const mongoose = require("mongoose");

// Sous-schema pour un vêtement
const clothingItemSchema = new mongoose.Schema({
  label: String, // ex: "T-shirt noir"
  category: String,
  forChild: { type: Boolean, default: false },
});

// Sous-schema pour un enfant
const childSchema = new mongoose.Schema({
  name: String,
  gender: String,
  dressing: [clothingItemSchema], // Sous-documents vêtements
});

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
  dressing: [clothingItemSchema],
  preferencesCompleted: { type: Boolean, default: false },
  children: [childSchema], // Référence aux enfants
  expoPushToken: String,

  notificationsEnabled: {
    type: Boolean,
    default: false,
  },
  notificationPreferences: [String],
});

module.exports = mongoose.model("User", userSchema);
