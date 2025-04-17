const cron = require('node-cron');
const moment = require('moment');
const User = require('../models/User');
const { sendWeatherNotification } = require('./notificationService');

// 🕓 Ce cron s'exécute toutes les heures pile (ex : 08:00, 09:00...)
// En production, on préfère un rythme horaire plutôt qu'une fois par minute
cron.schedule('0 * * * *', async () => {
  console.log('📨 Vérification des notifications météo à envoyer...');

  const now = moment(); // Récupère l'heure actuelle au format moment
  const currentHour = now.hour(); // Extrait l'heure (ex : 8, 12, 18)

  // Déterminer à quelle période de la journée on est
  let currentSlot = null;
  if (currentHour === 8) currentSlot = 'morning';
  else if (currentHour === 12) currentSlot = 'noon';
  else if (currentHour === 18) currentSlot = 'evening';

  // Si l'heure actuelle ne correspond à aucun créneau de notification, on ne fait rien
  if (!currentSlot) {
    console.log('⏩ Pas de notification prévue à cette heure.');
    return;
  }

  try {
    // 🔍 On récupère les utilisateurs qui ont activé les notifications pour ce créneau
    const users = await User.find({
      notificationsEnabled: true,
      [`notificationPreferences.${currentSlot}`]: true,
    });

    if (users.length === 0) {
      console.log(`🔕 Aucun utilisateur à notifier pour ${currentSlot}.`);
      return;
    }

    // 📤 Envoie une notification à chaque utilisateur concerné
    for (const user of users) {
      if (user.expoPushToken) {
        await sendWeatherNotification(user); // Fonction à définir dans notificationService.js
        console.log(`✅ Notification envoyée à ${user.firstName} (${currentSlot})`);
      } else {
        console.warn(`⚠️ Aucun token push pour l'utilisateur ${user.firstName}`);
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de l’envoi des notifications météo :', error);
  }
});