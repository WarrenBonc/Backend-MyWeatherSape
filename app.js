const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Initialisation de l'application Express
const app = express();

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(morgan("dev")); // Pour les logs des requêtes HTTP
app.use(express.json()); // Pour analyser le corps des requêtes JSON

// Connexion à la base de données MongoDB
const 
mongoose
  .connect(, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connecté à MongoDB"))
  .catch((err) => console.log("Erreur de connexion à MongoDB", err));






module.exports = app;
