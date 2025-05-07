const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authenticateToken = require("../middlewares/auth");
const { InferenceClient } = require("@huggingface/inference");
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Initialisation du client Hugging Face
const client = new InferenceClient(HF_API_KEY);

// Route pour recuperer la meteo
router.get("/7days-hourly/:city", async (req, res) => {
  try {
    const city = req.params.city;

    // 1. Géolocalisation de la ville
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${city}`
    );
    const geoData = await geoRes.json();
    if (!geoData[0])
      return res.status(404).json({ message: "Ville introuvable" });

    const lat = geoData[0].lat;
    const lon = geoData[0].lon;

    // 2. Récupérer les données météo Open-Meteo pour 7 jourss
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,weathercode&daily=weathercode&timezone=auto`;
    const weatherRes = await fetch(weatherUrl);
    const data = await weatherRes.json();

    // 3. Structurer les données par jour avec la condition météo globale
    const forecastByDay = {};
    const dailyConditions = data.daily.weathercode;

    data.hourly.time.forEach((dateTime, index) => {
      const [date, hour] = dateTime.split("T");

      if (!forecastByDay[date]) {
        forecastByDay[date] = {
          condition: getWeatherCondition(dailyConditions.shift()), // Condition globale pour le jour
          hours: [],
        };
      }

      // Assure-toi que chaque hour est correctement formaté avec ses données
      forecastByDay[date].hours.push({
        hour,
        temperature: data.hourly.temperature_2m[index], // Température en °C
        feels_like: data.hourly.apparent_temperature[index], // Température ressentie en °C
      });
    });

    // 4. Répondre avec les données structurées
    res.json({
      city,
      forecast: forecastByDay,
    });
  } catch (error) {
    console.error("Erreur météo:", error);
    res.status(500).json({
      message: "Erreur récupération météo",
      error: error.message,
    });
  }
});

// Route recommendation utilisateur principal
router.post("/recommendation", authenticateToken, async (req, res) => {
  const { city, dayOffset } = req.body;

  if (!city) {
    return res.status(400).json({ message: "Ville manquante." });
  }

  try {
    // 1. Récupération du profil utilisateur depuis la base de données
    const userId = req.user.id; // ID utilisateur ajouté par authenticateToken
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // 2. Récupération des données météo pour le jour spécifié
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        city
      )}`
    );
    const geoData = await geoRes.json();
    if (!geoData[0]) {
      return res.status(404).json({ message: "Ville introuvable." });
    }

    const lat = geoData[0].lat;
    const lon = geoData[0].lon;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max&timezone=auto`;
    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    const targetDay = parseInt(dayOffset) || 0;
    const dailyWeather = weatherData.daily;

    if (!dailyWeather || !dailyWeather.temperature_2m_max[targetDay]) {
      return res
        .status(404)
        .json({ message: "Données météo introuvables pour ce jour." });
    }

    // 3. Extraire les données météo pour le jour spécifié
    const maxTemp = dailyWeather.temperature_2m_max[targetDay];
    const minTemp = dailyWeather.temperature_2m_min[targetDay];
    const weatherCode = dailyWeather.weathercode[targetDay];
    const windSpeed = dailyWeather.windspeed_10m_max[targetDay];
    const precipitation = dailyWeather.precipitation_sum[targetDay];

    const condition = getWeatherCondition(weatherCode);

    // 4. Construction du message pour Hugging Face
    const message = `
Tu es un expert en recommandations vestimentaires pour la météo. Donne une **recommandation claire, fluide et naturelle**, en **français**, avec un **ton bienveillant et utile**. Ne saute pas de ligne, ne parle pas d'intelligence artificielle, et ne parle pas à la 3e personne. Tu dois t’adresser directement à l’utilisateur. **La recommandation finale ne doit pas dépasser 160 caractères.**

Voici son profil :
- Prénom : ${user.firstName || "Utilisateur"}
- Sensibilité au froid : ${user.sensitivity || "normale"}
- Accessoires préférés : ${user.accessories?.join(", ") || "aucun"}
- Fréquence de recommandations : ${
      user.recommendationFrequency || "quotidienne"
    }

Météo prévue à ${city} ${
      targetDay === 0
        ? "aujourd’hui"
        : targetDay === 1
        ? "demain"
        : `dans ${targetDay} jours`
    } :
- Température maximale : ${maxTemp}°C
- Température minimale : ${minTemp}°C
- Condition : ${condition}
- Vent : ${windSpeed} km/h
- Précipitations : ${precipitation} mm

Donne une **idée de tenue complète et adaptée** à la météo, incluant les couches de vêtements, les accessoires, et les chaussures. Ne donne qu’un seul conseil vestimentaire, clair, utile et sans hésitation.
`;

    // 5. Appel à l'API Hugging Face avec chatCompletion
    const chatCompletion = await client.chatCompletion({
      provider: "nebius",
      model: "deepseek-ai/DeepSeek-V3-0324",
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
      max_tokens: 160,
    });

    // Ajout du log de la réponse brute Hugging Face
    console.log("Réponse Hugging Face :", chatCompletion);

    // Vérification si une réponse a été générée
    if (
      !chatCompletion ||
      !chatCompletion.choices ||
      !chatCompletion.choices[0]
    ) {
      return res
        .status(500)
        .json({ error: "Aucune réponse générée par le modèle." });
    }

    const aiText = chatCompletion.choices[0].message.content;

    // 6. Retourner les recommandations au client
    res.json({ advice: aiText, firstName: user.firstName });
  } catch (error) {
    console.error("Erreur dans /recommendation :", error);
    res.status(500).json({
      message: "Erreur interne du serveur.",
      error: error.message,
    });
  }
});

// Route recommendation profil enfant
router.post("/recommendation/child", authenticateToken, async (req, res) => {
  const { city, dayOffset, childId } = req.body;

  if (!city) {
    return res.status(400).json({ message: "Ville manquante." });
  }

  try {
    // Récupération du profil utilisateur et de l'enfant
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const child = user.children.id(childId);
    if (!child) {
      return res.status(404).json({ message: "Enfant non trouvé." });
    }

    // Récupération des données météo
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        city
      )}`
    );
    const geoData = await geoRes.json();
    if (!geoData[0]) {
      return res.status(404).json({ message: "Ville introuvable." });
    }

    const lat = geoData[0].lat;
    const lon = geoData[0].lon;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max&timezone=auto`;
    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    const targetDay = parseInt(dayOffset) || 0;
    const dailyWeather = weatherData.daily;

    if (!dailyWeather || !dailyWeather.temperature_2m_max[targetDay]) {
      return res
        .status(404)
        .json({ message: "Données météo introuvables pour ce jour." });
    }

    const maxTemp = dailyWeather.temperature_2m_max[targetDay];
    const minTemp = dailyWeather.temperature_2m_min[targetDay];
    const weatherCode = dailyWeather.weathercode[targetDay];
    const windSpeed = dailyWeather.windspeed_10m_max[targetDay];
    const precipitation = dailyWeather.precipitation_sum[targetDay];

    const condition = getWeatherCondition(weatherCode);

    // Construction du prompt
    const prompt = `
Tu es un expert en style vestimentaire pour enfants. Donne une **recommandation claire, fluide et naturelle**, en **français**, avec un **ton bienveillant et utile**. Ne saute pas de ligne, ne parle pas d'intelligence artificielle, et ne parle pas à la 3e personne. Tu dois t’adresser directement à l’utilisateur **avec 160 caractères maximum**.

Voici le profil de l'enfant :
- Prénom : ${child.name}
- Genre : ${child.gender}
- Vêtements disponibles : ${
      child.dressing.map((item) => item.label).join(", ") || "aucun"
    }

Météo prévue à ${city} ${
      targetDay === 0
        ? "aujourd’hui"
        : targetDay === 1
        ? "demain"
        : `dans ${targetDay} jours`
    } :
- Température maximale : ${maxTemp}°C
- Température minimale : ${minTemp}°C
- Condition : ${condition}
- Vent : ${windSpeed} km/h
- Précipitations : ${precipitation} mm

Donne une **idée de tenue complète et adaptée** à la météo pour cet enfant, incluant les couches de vêtements, les accessoires, et les chaussures. Ne donne qu’un seul conseil vestimentaire, clair, utile et sans hésitation.
`;

    // Appel à l'API Hugging Face avec chatCompletion
    const chatCompletion = await client.chatCompletion({
      provider: "nebius",
      model: "deepseek-ai/DeepSeek-V3-0324",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 512,
    });

    // Vérification si une réponse a été générée
    if (
      !chatCompletion ||
      !chatCompletion.choices ||
      !chatCompletion.choices[0]
    ) {
      return res
        .status(500)
        .json({ error: "Aucune réponse générée par le modèle." });
    }

    const aiText = chatCompletion.choices[0].message.content;

    // Retourner les recommandations au client
    res.json({ advice: aiText, childName: child.name });
  } catch (error) {
    console.error("Erreur dans /recommendation/child :", error);
    res.status(500).json({
      message: "Erreur interne du serveur.",
      error: error.message,
    });
  }
});

// Fonction pour convertir le code météo en texte
function getWeatherCondition(code) {
  switch (code) {
    case 0:
      return "Ensoleillé";
    case 1:
    case 2:
    case 3:
      return "Partiellement nuageux";
    case 45:
    case 48:
      return "Brouillard";
    case 51:
    case 53:
    case 55:
      return "Bruine légère";
    case 61:
    case 63:
    case 65:
      return "Pluie";
    case 71:
    case 73:
    case 75:
      return "Neige";
    case 95:
      return "Orage";
    default:
      return "Inconnu";
  }
}

module.exports = router;
