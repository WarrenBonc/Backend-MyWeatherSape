const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const { getWeatherByCity, getForecastByCity } = require('../services/weatherAPI');

// Route 1 : GET /api/weather?city=Paris
router.get('/', async (req, res) => {
  const city = req.query.city;

  if (!city) {
    return res.status(400).json({ message: 'Ville manquante' });
  }

  try {
    const weather = await getWeatherByCity(city);
    res.json(weather);
  } catch (error) {
    console.error("Erreur météo:", error);
    res.status(500).json({
      message: 'Erreur récupération météo',
      error: error.message,
    });
  }
});

// Route 2 : POST /api/weather/recommendation
router.post('/recommendation', async (req, res) => {
  const { userId, city } = req.body;

  if (!userId || !city) {
    return res.status(400).json({ message: 'Champs manquants : userId et city requis.' });
  }

  try {
    // 1. Récupération du profil utilisateur
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    // 2. Récupération de la météo
    const weather = await getWeatherByCity(city);

    // 3. Construction du prompt pour Hugging Face
    const prompt = `Tu es un expert en style vestimentaire. Voici le profil de la personne :
- Prénom : ${user.name || 'Utilisateur'}
- Sensibilité au froid : ${user.sensitivity || 'normale'}
- Accessoires préférés : ${user.accessories?.join(', ') || 'aucun'}

La météo du jour à ${weather.city} est :
- Température : ${weather.temperature}°C (ressenti ${weather.feels_like}°C)
- Condition : ${weather.condition}
- Vent : ${weather.wind} km/h
- Humidité : ${weather.humidity}%

Quels vêtements et accessoires devrais-tu lui recommander aujourd’hui ? Sois clair, personnalisé et donne un ton bienveillant.`;

    // 4. Appel Hugging Face
    const hfResponse = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
      { inputs: prompt },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        },
        timeout: 30000,
      }
    );

    const aiText = hfResponse.data[0]?.generated_text || 'Pas de réponse générée.';
    res.json({ advice: aiText });

  } catch (error) {
    console.error("Erreur dans /recommendation:", error);
    res.status(500).json({ message: 'Erreur interne serveur', error: error.message });
  }
});

// Route 3 : GET /api/weather/forecast?city=Paris&days=7
router.get('/forecast', async (req, res) => {
  const { city, days } = req.query;

  if (!city) {
    return res.status(400).json({ message: 'Ville manquante' });
  }

  const dayCount = days ? parseInt(days, 5) : 5;

  try {
    const forecast = await getForecastByCity(city, dayCount);
    res.json(forecast);
  } catch (error) {
    console.error('Erreur dans /forecast:', error.message);
    res.status(500).json({ message: 'Erreur récupération des prévisions météo', error: error.message });
  }
});

module.exports = router;