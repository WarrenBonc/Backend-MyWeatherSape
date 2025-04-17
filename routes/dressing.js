const express = require('express');
const router = express.Router();
const ClothingItem = require('../models/ClothingItem');
const authenticateToken = require('../middlewares/auth');

// GET /api/dressing/adult
router.get('/adult', authenticateToken, async (req, res) => {
  const items = await ClothingItem.find({ userId: req.user.id, forChild: false });
  res.json(items);
});

// POST /api/dressing/add
router.post('/add', authenticateToken, async (req, res) => {
  const { label, category, season, forChild } = req.body;
  const newItem = new ClothingItem({ userId: req.user.id, label, category, season, forChild });
  await newItem.save();
  res.json(newItem);
});

// DELETE /api/dressing/delete/:id
router.delete('/delete/:id', authenticateToken, async (req, res) => {
  const item = await ClothingItem.findById(req.params.id);
  
  if (!item) {
    return res.status(404).json({ message: 'Vêtement introuvable' });
  }
  
  if (item.userId.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Non autorisé à supprimer ce vêtement' });
  }
  
  await item.deleteOne();
  res.json({ message: 'Vêtement supprimé' });
});

// GET /api/dressing/child
router.get('/child', authenticateToken, async (req, res) => {
  const items = await ClothingItem.find({ userId: req.user.id, forChild: true });
  res.json(items);
});

// PUT /api/dressing/edit/:id
router.put('/edit/:id', authenticateToken, async (req, res) => {
  const { label, category, season, forChild } = req.body;
  try {
    const updatedItem = await ClothingItem.findByIdAndUpdate(
      req.params.id,
      { label, category, season, forChild },
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).json({ message: 'Vêtement non trouvé' });
    }
    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du vêtement', error });
  }
});
  
module.exports = router;