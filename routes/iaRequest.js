var express = require("express");
var router = express.Router();
const axios = require("axios");

// Clé API Hugging Face (NE PAS partager publiquement)
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Route POST pour interroger Hugging Face avec un prompt
router.post("/request", async (req, res) => {
  const { prompt } = req.body;

  // Vérification si le prompt est vide
  if (!prompt) {
    return res.status(400).json({ error: "Veuillez fournir un prompt." });
  }

  try {
    // Requête vers l'API Hugging Face
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct",
      { inputs: prompt },
      {
        headers: { Authorization: `Bearer ${HF_API_KEY}` },
        timeout: 30000,
      }
    );

    // Vérification si l'API a bien répondu
    if (response.data.error) {
      return res.status(500).json({ error: response.data.error });
    }

    // Envoi de la réponse au client
    res.json({ response: response.data });
  } catch (error) {
    console.error(
      "Erreur Hugging Face:",
      error.response?.data || error.message
    );
    res.status(500).json({
      error: "Erreur du serveur Hugging Face",
      details: error.response?.data || error.message,
    });
  }
});

// Exportation du routeur
module.exports = router;
