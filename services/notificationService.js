const axios = require('axios');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function sendWeatherNotification(user) {
  try {
    const res = await axios.post('http://192.168.1.45:3000/api/weather/recommendation', {
      userId: user._id,
      city: user.city, // ou autre champ pertinent
    });

    const advice = res.data.advice;
    console.log(`📬 Notification pour ${user.email} : ${advice}`);

    // 🚀 Envoi d'une notification push via Expo
    if (user.expoPushToken) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: user.expoPushToken,
          sound: 'default',
          title: 'Conseil météo du jour 🌤️',
          body: advice,
        }),
      });
    } else {
      console.warn(`⚠️ Aucun token Expo pour ${user.email}`);
    }
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de la notification :", error.message);
  }
}

module.exports = { sendWeatherNotification };