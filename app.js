const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
dotenv.config();

// Initialisation de l'application Express
const app = express();
const dressingRoutes = require("./routes/dressing");
const usersRoute = require("./routes/users");
const weatherRoutes = require("./routes/weather");
const notificationsRouter = require("./routes/notifications");
// const authRoutes = require("./routes/auth");

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(morgan("dev")); // Pour les logs des requêtes HTTP
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Pour analyser le corps des requêtes JSON

app.get("/", (req, res) => {
  res.send("Serveur de l'API de MyWeatherSape opérationnel");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connecté"))
  .catch((err) => console.error("❌ Erreur MongoDB :", err));

// Routes

app.use("/api/dressing", dressingRoutes);
app.use("/api/users", usersRoute);
app.use("/api/weather", weatherRoutes);
app.use("/api/notifications", notificationsRouter);
// app.use("/api/auth", authRoutes);

module.exports = app;
