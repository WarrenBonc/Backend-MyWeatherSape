const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  firstName: String,
  gender: { type: String, enum: ['M', 'F'] }, //// Seuls les valeurs "M" ou "F" sont valides
  sensitivity: {
    type: String,
    enum: [
      'frileux',
      'sensible au froid',
      'neutre',
      'le froid ne me dérange pas',
      "j'ai vite chaud",
      'résistant au froid'
    ]
  },
  email: { type: String, unique: true },
  birthdate: Date,
  password: String,
  style: String,        // ex: "casual"
  accessories: [{
    type: String,
    enum: ['casquette', 'bonnet', 'écharpe', 'gants', 'sac à dos', 'lunettes de soleil'] //Accessoires favoris
  }],
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Child' }], // Référence aux enfants

  //champ pour la reinitialisation du mot de passe

  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiry: {
    type: Date,
    default: null
  }

});

module.exports = mongoose.model('User', userSchema);