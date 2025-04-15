const axios = require('axios');

async function getWeatherByCity(city) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&lang=fr&appid=${apiKey}`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    return {
      temperature: data.main.temp,
      feels_like: data.main.feels_like,
      condition: data.weather[0].description,
      wind: data.wind.speed,
      humidity: data.main.humidity,
      city: data.name,
    };
  } catch (error) {
    console.error(`Erreur API météo : ${error.message}`);
    throw new Error('Impossible de récupérer la météo.');
  }
}

async function getForecastByCity(city, days = 3) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&cnt=${days}&units=metric&lang=fr&appid=${apiKey}`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Erreur API prévisions : ${error.message}`);
    throw new Error('Impossible de récupérer la météo sur plusieurs jours.');
  }
}

module.exports = { getWeatherByCity, getForecastByCity };