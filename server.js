require("dotenv").config();

const express = require("express");
const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= ROUTES =================
const ussdRoutes = require("./src/routes/ussdRoutes");

// 🔥 MAIN ROUTES
app.use("/ussd", ussdRoutes);
app.use("/subscription", ussdRoutes);

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("🚀 BDApps USSD Server Running");
});

// ================= HEALTH =================
app.get("/health", (req, res) => {
  res.send("OK");
});

// ================= ERROR HANDLER =================
app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);
  res.status(500).send("Internal Server Error");
});

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} ✅`);
});
