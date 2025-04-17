

const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Route pour sauvegarder les préférences de notifications
router.post('/save-preferences', async (req, res) => {
  const { userId, preferences, notificationsEnabled } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId manquant' });
  }

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
router.get('/preferences/:userId', async (req, res) => {
    const { userId } = req.params;
  
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