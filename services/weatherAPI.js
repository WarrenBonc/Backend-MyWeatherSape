const axios = require('axios');

async function getWeatherByCity(city) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&lang=fr&appid=${apiKey}`;

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
}

module.exports = { getWeatherByCity };