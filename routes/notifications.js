

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middlewares/auth');

// Route pour sauvegarder les préférences de notifications
router.post('/save-preferences', auth, async (req, res) => {
  const { preferences, notificationsEnabled } = req.body;
  const userId = req.user._id;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          notificationPreferences: preferences,
          notificationsEnabled: notificationsEnabled,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ message: 'Préférences mises à jour', user: updatedUser });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour récupérer les préférences de notifications d'un utilisateur
router.get('/preferences', auth, async (req, res) => {
    const userId = req.user._id;
  
    try {
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
  
      res.json({
        notificationsEnabled: user.notificationsEnabled,
        preferences: user.notificationPreferences || [],
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des préférences :', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

module.exports = router;