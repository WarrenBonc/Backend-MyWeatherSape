const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  sensitivity: String,  // ex: "frileux"
  style: String,        // ex: "casual"
  accessories: [String], // ex: ["bonnet", "parapluie"]
  childClothes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem' }],
});

module.exports = mongoose.model('User', userSchema);