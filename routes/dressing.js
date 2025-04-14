const express = require('express');
const router = express.Router();
const ClothingItem = require('../models/ClothingItem');

// GET /api/dressing/:userId
router.get('/:userId', async (req, res) => {
  const items = await ClothingItem.find({ userId: req.params.userId, forChild: false });
  res.json(items);
});

// POST /api/dressing/add
router.post('/add', async (req, res) => {
  const { userId, label, category, season, forChild } = req.body;
  const newItem = new ClothingItem({ userId, label, category, season, forChild });
  await newItem.save();
  res.json(newItem);
});

// DELETE /api/dressing/delete/:id
router.delete('/delete/:id', async (req, res) => {
  await ClothingItem.findByIdAndDelete(req.params.id);
  res.json({ message: 'Vêtement supprimé' });
});

// GET /api/dressing/child/:userId
router.get('/child/:userId', async (req, res) => {
  const items = await ClothingItem.find({ userId: req.params.userId, forChild: true });
  res.json(items);
});

module.exports = router;