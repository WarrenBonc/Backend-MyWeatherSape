const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/auth");
const User = require("../models/User");

//route pour récupérer les vêtements
router.get("/", authenticateToken, async (req, res) => {
  const userId = req.user.id; // Récupérer l'ID de l'utilisateur à partir du token

  try {
    const user = await User.findById(userId).select("dressing children");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let dressingItems = user.dressing;
    console.log("Dressing items:", dressingItems);

    //user > children > [dressing]
    const children = user.children;
    const childrenDressing = children.map((child) =>
      child.dressing
        .map((item) => ({
          _id: item._id.toString(), // Convertir en chaîne pour éviter les références circulaires
          label: item.label,
          category: item.category,
          forChild: item.forChild,
          childId: child._id.toString(), // Ajouter l'ID de l'enfant
          childName: child.name, // Ajouter le nom de l'enfant
        }))
        .flat()
    );
    console.log("Children dressing:", childrenDressing);

    res.json({
      data: dressingItems,
      childrenDressing: childrenDressing,
      children: children,
    });
  } catch (error) {
    console.error("Error fetching dressing items:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

//route pour ajouter un vêtement
router.post("/", authenticateToken, async (req, res) => {
  const userId = req.user.id; // Récupérer l'ID de l'utilisateur à partir du token
  const { label, category, childId, forChild } = req.body;
  console.log(
    "forChild:",
    forChild,
    "childId:",
    childId,
    "label:",
    label,
    "category:",
    category
  );
  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (forChild === "true" || forChild === true) {
      // ajouter un vêtement pour un enfant
      const child = user.children.id(childId); // Récupérer l'enfant par son ID
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }
      const newClothingItem = {
        label,
        category,
        forChild,
      };
      child.dressing.push(newClothingItem); // Ajouter le vêtement à la liste des vêtements de l'enfant
      await user.save();
      return res.status(201).json({
        message: "Clothing item added successfully",
        data: newClothingItem,
      });
    }
    // ajouter un vêtement pour l'utilisateur
    const newClothingItem = {
      label,
      category,
      forChild,
    };

    // Ajouter le vêtement à la collection de vêtements de l'utilisateur
    user.dressing.push(newClothingItem);
    await user.save();

    res.status(201).json({
      message: "Clothing item added successfully",
      data: newClothingItem,
    });
  } catch (error) {
    console.error("Error adding clothing item:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

//route pour supprimer un vêtement
router.delete("/", authenticateToken, async (req, res) => {
  const userId = req.user.id; // Récupérer l'ID de l'utilisateur à partir du token
  const { clothingId, childId, forChild } = req.body;
  console.log("clothingId:", clothingId);
  console.log("childId:", childId);
  console.log("forChild:", forChild);
  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (forChild === true || forChild === "true") {
      // supprimer un vêtement pour un enfant
      const child = user.children.id(childId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }
      const initialLength = child.dressing.length;
      child.dressing = child.dressing.filter(
        (item) => item._id.toString() !== clothingId
      );
    }
    // Supprimer le vêtement de la collection de vêtements de l'utilisateur
    user.dressing = user.dressing.filter(
      (item) => item._id.toString() !== clothingId
    );
    await user.save();

    res.status(200).json({ message: "Clothing item deleted successfully" });
  } catch (error) {
    console.error("Error deleting clothing item:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
