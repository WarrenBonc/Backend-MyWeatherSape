const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connecté"))
  .catch(err => console.error("❌ Erreur MongoDB :", err));

// Routes
const dressingRoutes = require('./routes/dressing');
app.use('/api/dressing', dressingRoutes);

app.listen(3000, () => {
  console.log("🚀 Backend lancé sur http://localhost:3000");
});