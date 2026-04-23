const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// ================= MONGO CONNECT =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("Mongo Error:", err.message));

// ================= MODEL =================
const User = mongoose.model("User", {
  phone: { type: String, unique: true },
  active: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// ================= CONTROLLER =================
const controller = require("../controllers/ussdController");

// ================= MIDDLEWARE =================
router.use((req, res, next) => {
  req.User = User;
  next();
});

// ================= USSD ROUTES =================

// 👉 /ussd
router.post("/", controller.handleUSSD);

// 👉 /ussd/receive
router.post("/receive", controller.handleUSSD);

// ================= SUBSCRIPTION ROUTES =================

// 👉 /subscription  (because server.js uses /subscription base)
router.post("/", controller.handleSubscription);

// 👉 /subscription/receive
router.post("/receive", controller.handleSubscription);

// ================= EXPORT =================
module.exports = router;
