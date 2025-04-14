const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();
require("./models/connection");

// Initialisation de l'application Express
const app = express();

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(morgan("dev")); // Pour les logs des requêtes HTTP
app.use(express.json()); // Pour analyser le corps des requêtes JSON

// Connexion à la base de données MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connecté"))
  .catch(err => console.error("❌ Erreur MongoDB :", err));

// Routes
const dressingRoutes = require('./routes/dressing');

app.use('/api/dressing', dressingRoutes);




module.exports = app;
