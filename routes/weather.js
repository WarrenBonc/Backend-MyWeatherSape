const express = require("express");
const router = express.Router();
const axios = require("axios");
const User = require("../models/User");
const authenticateToken = require("../middlewares/auth");
const {
  getWeatherByCity,
  getForecastByCity,
} = require("../services/weatherAPI");
const { InferenceClient } = require("@huggingface/inference");
// Clé API Hugging Face (NE PAS partager publiquement)
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Initialisation du client Hugging Face
const client = new InferenceClient(HF_API_KEY);

// Route 1 : GET /api/weather
router.get("/", async (req, res) => {
  const city = req.query.city;

  if (!city) {
    return res.status(400).json({ message: "Ville manquante" });
  }

  try {
    const weather = await getWeatherByCity(city);
    res.json(weather);
  } catch (error) {
    console.error("Erreur météo:", error);
    res.status(500).json({
      message: "Erreur récupération météo",
      error: error.message,
    });
  }
});

// Route 2 : GET /api/weather/7days-hourly/:city
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

// Route 3 : POST /api/weather/recommendation
router.post("/recommendation", authenticateToken, async (req, res) => {
  const { city, dayOffset } = req.body;

  if (!city) {
    return res.status(400).json({ message: "Ville manquante." });
  }

  try {
    // 1. Récupération du profil utilisateur depuis la base de données
    const userId = req.user.id; // ID utilisateur ajouté par authenticateToken
    const user = await User.findOne({ _id: userId });
    const array = req.user;
    console.log("token bro", array);

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

    // 4. Construction du prompt pour Hugging Face
    const prompt = `
Tu es un expert en style vestimentaire. Donne une **recommandation claire, fluide et naturelle**, en **français**, avec un **ton bienveillant et utile**. Ne saute pas de ligne, ne parle pas d'intelligence artificielle, et ne parle pas à la 3e personne. Tu dois t’adresser directement à l’utilisateur**avec 160 caractères maximum**.

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

Donne une **idée de tenue complète et adaptée** à la météo, incluant les couches de vêtements, les accessoires, et les chaussures. Tu peux t’inspirer de ce qu’il pourrait avoir dans son dressing, mais tu n’es pas obligé. Ne donne qu’un seul conseil vestimentaire, clair, utile et sans hésitation.
`;

    // Ajout du log du prompt avant l'appel à l'API Hugging Face
    console.log("Prompt envoyé à Hugging Face :\n", prompt);

    // 5. Appel à l'API Hugging Face avec chatCompletion
    const chatCompletion = await client.chatCompletion({
      provider: "nebius",
      model: "meta-llama/Llama-3.2-3B-Instruct",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 512,
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

router.post("/recommendation/child", authenticateToken, async (req, res) => {
  const { city, dayOffset, childId } = req.body;

  if (!city) {
    return res.status(400).json({ message: "Ville manquante." });
  }

  try {
    // 1. Récupération du profil utilisateur et de l'enfant
    const userId = req.user.id; // ID utilisateur ajouté par authenticateToken
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const child = user.children.id(childId); // Récupérer l'enfant par son ID
    if (!child) {
      return res.status(404).json({ message: "Enfant non trouvé." });
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

    // 4. Construction du prompt pour Hugging Face
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

    // Ajout du log du prompt avant l'appel à l'API Hugging Face
    console.log("Prompt envoyé à Hugging Face :\n", prompt);

    // 5. Appel à l'API Hugging Face avec chatCompletion
    const chatCompletion = await client.chatCompletion({
      provider: "nebius",
      model: "meta-llama/Llama-3.2-3B-Instruct",
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

    // 6. Retourner les recommandations au client
    res.json({ advice: aiText, childName: child.name });
  } catch (error) {
    console.error("Erreur dans /recommendation/child :", error);
    res.status(500).json({
      message: "Erreur interne du serveur.",
      error: error.message,
    });
  }
});

// Route 4 : GET /api/weather/forecast
router.get("/forecast", async (req, res) => {
  const { city, days } = req.query;

  if (!city) {
    return res.status(400).json({ message: "Ville manquante" });
  }

  const nbDays = parseInt(days) || 5;

  try {
    const rawData = await getForecastByCity(city, nbDays);
    const dailyData = {};

    rawData.list.forEach((item) => {
      const date = item.dt_txt.split(" ")[0];
      const tempMin = item.main.temp_min;
      const tempMax = item.main.temp_max;
      const description = item.weather[0].description;

      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          temp_min: tempMin,
          temp_max: tempMax,
          descriptions: [description],
        };
      } else {
        dailyData[date].temp_min = Math.min(dailyData[date].temp_min, tempMin);
        dailyData[date].temp_max = Math.max(dailyData[date].temp_max, tempMax);
        dailyData[date].descriptions.push(description);
      }
    });

    const result = Object.values(dailyData).map((d) => ({
      date: d.date,
      temp_min: Math.round(d.temp_min),
      temp_max: Math.round(d.temp_max),
      condition: [...new Set(d.descriptions)].join(", "),
    }));

    res.json({ forecast: result });
  } catch (error) {
    console.error("Erreur dans /forecast:", error.message);
    res.status(500).json({
      message: "Erreur récupération des prévisions météo",
      error: error.message,
    });
  }
});

// Route 5 : GET /api/weather/day
router.get("/day", async (req, res) => {
  const { city, day } = req.query;

  if (!city) return res.status(400).json({ message: "Ville manquante" });

  const targetDay = parseInt(day) || 0;

  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
      city
    )}&units=metric&lang=fr&appid=${apiKey}`;
    const response = await axios.get(url);

    const list = response.data.list;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + targetDay);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    const result = list
      .filter((item) => item.dt_txt.startsWith(targetDateStr))
      .map((item) => {
        return {
          hour: item.dt_txt.split(" ")[1].slice(0, 5), // HH:MM
          temp: Math.round(item.main.temp),
          icon: item.weather[0].icon,
          condition: item.weather[0].description,
        };
      });

    res.json({ date: targetDateStr, forecast: result });
  } catch (error) {
    console.error("Erreur dans /day:", error.message);
    res.status(500).json({
      message: "Erreur récupération des prévisions par jour",
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
