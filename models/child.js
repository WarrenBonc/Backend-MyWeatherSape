const mongoose = require('mongoose');


const childSchema = new mongoose.Schema({
    name: String,
    gender: { type: String, enum: ['M', 'F'] }, //// Seuls les valeurs "M" ou "F" sont valides
    ageGroup: { type: String, enum: ['bébé', 'enfant', 'ado'] }, //// Seuls ces trois groupes d'âge sont valides
    clothes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem' }]

  });
  
  
  module.exports = mongoose.model('Child', childSchema);