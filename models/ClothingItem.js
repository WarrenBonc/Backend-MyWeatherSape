const mongoose = require('mongoose');

const clothingItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  label: String,              // ex: "T-shirt noir"
  category: {
    type: String,
    enum: ['haut', 'bas', 'accessoire']
  },
  season: {
    type: String,
    enum: ['été', 'hiver', 'printemps', 'automne']
  },
  forChild: { type: Boolean, default: false }
});

module.exports = mongoose.model('ClothingItem', clothingItemSchema);