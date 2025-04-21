var express = require("express");
var router = express.Router();
const { InferenceClient } = require("@huggingface/inference");

// Clé API Hugging Face (NE PAS partager publiquement)
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Initialisation du client Hugging Face
const client = new InferenceClient(HF_API_KEY);

// Route POST pour interroger Hugging Face avec un prompt
router.post("/request", async (req, res) => {
  const { prompt } = req.body;

  // Vérification si le prompt est vide
  if (!prompt) {
    return res.status(400).json({ error: "Veuillez fournir un prompt." });
  }

  try {
    // Requête vers l'API Hugging Face avec chatCompletion
    const chatCompletion = await client.chatCompletion({
      provider: "nebius",
      model: "meta-llama/Llama-3.1-8B-Instruct",
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

    // Envoi de la réponse au client
    res.json({ response: chatCompletion.choices[0].message });
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
