const express = require("express");
const router = express.Router();

const authenticateToken = require("../middlewares/auth");
const User = require("../models/User");


// GET /api/dressing?forChild=false
// GET /api/dressing?forChild=true&category=haut

router.get("/", authenticateToken, async (req, res) => {
  const { forChild } = req.query; // Récupère le paramètre forChild

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    if (forChild === "true") {
      // Récupérer le dressing des enfants
      const childrenDressing = user.children.map((child) => child.dressing).flat();
      return res.json({ data: childrenDressing });
    }

    // Récupérer le dressing principal
    res.json({ data: user.dressing });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du dressing", error });
  }
});

// POST /api/dressing
router.post("/", authenticateToken, async (req, res) => {
  console.log("Requête reçue :", req.body);

  const { label, category, forChild, childId } = req.body;

  if (!label || !category) {
    return res.status(400).json({ message: "Label et catégorie sont requis" });
  }

  // Conversion de forChild en booléen
  const isForChild = forChild === true || forChild === "true";

  // Création de l'objet vêtement
  const clothingItem = { label, category };

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    let newItem;

    if (isForChild) {
      // Vérification de childId
      if (!childId) {
        return res.status(400).json({ message: "childId est requis pour ajouter un vêtement à un enfant" });
      }

      // Ajout pour un enfant
      const child = user.children.id(childId);
      if (!child) return res.status(404).json({ message: "Enfant non trouvé" });

      child.dressing.push(clothingItem);
      newItem = child.dressing[child.dressing.length - 1]; // récupère le dernier ajouté
    } else {
      // Ajout pour l'utilisateur principal
      user.dressing.push(clothingItem);
      newItem = user.dressing[user.dressing.length - 1];
      
       // récupère le dernier ajouté
    }
    await user.save();
    
    res.status(201).json({ message: "Vêtement ajouté avec succès", item: newItem}); // renvoi de l'objet complet avec son _id
     // renvoi de l'objet complet avec son _id
  } catch (error) {
    console.error("Erreur lors de l'ajout du vêtement :", error);
    res.status(500).json({ message: "Erreur lors de l'ajout du vêtement", error });
  }
});

  // DELETE /api/dressing/:clothingId
router.delete("/:clothingId", authenticateToken, async (req, res) => {
  const { clothingId } = req.params; // Récupère l'ID du vêtement à supprimer
  const { childId } = req.query; // Optionnel : ID de l'enfant

  console.log("Clothing ID :", clothingId);
  console.log("Child ID :", childId);

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    console.log("Dressing principal :", user.dressing);

    if (childId) {
      // Suppression dans le dressing d'un enfant
      const child = user.children.id(childId);
      if (!child) return res.status(404).json({ message: "Enfant non trouvé" });

      const clothingIndex = child.dressing.findIndex((item) => item._id.toString() === clothingId);
      if (clothingIndex === -1) {
        return res.status(404).json({ message: "Vêtement non trouvé dans le dressing de l'enfant" });
      }

      child.dressing.splice(clothingIndex, 1); // Supprime le vêtement
    } else {
      // Suppression dans le dressing principal
      const clothingIndex = user.dressing.findIndex((item) => item._id.toString() === clothingId);
      console.log("Index trouvé :", clothingIndex);

      if (clothingIndex === -1) {
        return res.status(404).json({ message: "Vêtement non trouvé dans le dressing principal" });
      }

      user.dressing.splice(clothingIndex, 1); // Supprime le vêtement
    }

    await user.save();
    res.status(200).json({ message: "Vêtement supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du vêtement :", error);
    res.status(500).json({ message: "Erreur lors de la suppression du vêtement", error });
  }
});

// PUT /api/dressing/:clothingId
router.put("/:clothingId", authenticateToken, async (req, res) => {
  const { clothingId } = req.params; // Récupère l'ID du vêtement à mettre à jour
  const { childId } = req.query; // Optionnel : ID de l'enfant
  const { label, category } = req.body; // Champs à mettre à jour

  if (!label && !category) {
    return res.status(400).json({ message: "Au moins un champ (label ou catégorie) doit être fourni pour la mise à jour" });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    let clothingItem;

    if (childId) {
      // Mise à jour dans le dressing d'un enfant
      const child = user.children.id(childId);
      if (!child) return res.status(404).json({ message: "Enfant non trouvé" });

      clothingItem = child.dressing.id(clothingId);
      if (!clothingItem) {
        return res.status(404).json({ message: "Vêtement non trouvé dans le dressing de l'enfant" });
      }
    } else {
      // Mise à jour dans le dressing principal
      clothingItem = user.dressing.id(clothingId);
      if (!clothingItem) {
        return res.status(404).json({ message: "Vêtement non trouvé dans le dressing principal" });
      }
    }

    // Mise à jour des champs
    if (label) clothingItem.label = label;
    if (category) clothingItem.category = category;

    await user.save();
    res.status(200).json({ message: "Vêtement mis à jour avec succès", data: clothingItem });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du vêtement :", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour du vêtement", error });
  }
});


module.exports = router;
