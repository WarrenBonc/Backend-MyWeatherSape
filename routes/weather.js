const express = require("express");
const router = express.Router();
const axios = require("axios");
const User = require("../models/User");
const {
  getWeatherByCity,
  getForecastByCity,
} = require("../services/weatherAPI");

// Route 1 : GET /api/
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

//xs
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

    // 2. Récupérer les données météo Open-Meteo pour 7 jours
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
          condition: getWeatherCondition(dailyConditions.shift()),
          hours: {},
        };
      }

      forecastByDay[date].hours[hour] = {
        temperature: data.hourly.temperature_2m[index],
        feels_like: data.hourly.apparent_temperature[index],
      };
    });

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

// Fonction pour convertir le code météo en texte
function getWeatherCondition(code) {
  switch (code) {
    case 0:
      return "Ensoleillé";
    case 1:
    case 2:
    case 3:
      return "Partiellement nuageux";
    case 4:
      return "Nuageux";
    case 5:
    case 6:
    case 7:
      return "Pluie légère";
    case 8:
    case 9:
      return "Pluie forte";
    default:
      return "Inconnu";
  }
}

// Fonction pour transformer le code météo en texte lisible
function getWeatherCondition(code) {
  switch (code) {
    case 0:
      return "Ensoleillé";
    case 1:
    case 2:
    case 3:
      return "Partiellement nuageux";
    case 4:
      return "Nuageux";
    case 5:
    case 6:
    case 7:
      return "Pluie légère";
    case 8:
    case 9:
      return "Pluie forte";
    default:
      return "Inconnu";
  }
}

// Route 2 : POST /api/weather/recommendation
router.post("/recommendation", async (req, res) => {
  const { userToken, city } = req.body;

  if (!userToken || !city) {
    return res
      .status(400)
      .json({ message: "Champs manquants : userId et city requis." });
  }

  try {
    // 1. Récupération du profil utilisateur
    const user = await User.findById(userToken);
    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé" });

    // 2. Récupération de la météo
    const weather = await getWeatherByCity(city);

    // 3. Construction du prompt pour Hugging Face
    const prompt = `Tu es un expert en style vestimentaire. Voici le profil de la personne :
- Prénom : ${user.name || "Utilisateur"}
- Sensibilité au froid : ${user.sensitivity || "normale"}
- Accessoires préférés : ${user.accessories?.join(", ") || "aucun"}

La météo du jour à ${weather.city} est :
- Température : ${weather.temperature}°C (ressenti ${weather.feels_like}°C)
- Condition : ${weather.condition}
- Vent : ${weather.wind} km/h
- Humidité : ${weather.humidity}%

Quels vêtements et accessoires devrais-tu lui recommander aujourd’hui ? Sois clair, personnalisé et donne un ton bienveillant.`;

    // 4. Appel Hugging Face
    const hfResponse = await axios.post(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1",
      { inputs: prompt },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        },
        timeout: 30000,
      }
    );

    const aiText =
      hfResponse.data[0]?.generated_text || "Pas de réponse générée.";
    res.json({ advice: aiText });
  } catch (error) {
    console.error("Erreur dans /recommendation:", error);
    res
      .status(500)
      .json({ message: "Erreur interne serveur", error: error.message });
  }
});

// Route 3 : GET /api/weather/forecast
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

// Route 4 : GET /api/weather/day
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

module.exports = router;
