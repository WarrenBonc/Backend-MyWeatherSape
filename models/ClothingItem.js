const mongoose = require('mongoose');

const clothingItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  label: String,              // ex: "T-shirt noir"
  category: String,           // ex: "haut", "bas", "accessoire"
  season: String,             // ex: "été", "hiver"
  forChild: { type: Boolean, default: false }
});

module.exports = mongoose.model('ClothingItem', clothingItemSchema);