require("dotenv").config();

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// ================= MIDDLEWARE =================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ================= ROUTES =================
app.use("/", require("./src/routes/ussdRoutes"));

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("SportzFX Running ✅");
});

// ================= HEALTH =================
app.get("/health", (req, res) => {
  res.send("OK");
});

// ================= FALLBACK =================
app.use((req, res) => {
  res.status(404).send("Route not found");
});

// ================= START =================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
