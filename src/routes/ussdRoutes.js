const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// ================= MONGO CONNECT (FIXED) =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("Mongo Error:", err.message));

// ================= MODEL =================
const User = mongoose.model("User", {
  phone: { type: String, unique: true },
  active: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// ================= IMPORT CONTROLLER =================
const controller = require("../controllers/ussdController");

// ================= MIDDLEWARE =================
router.use((req, res, next) => {
  req.User = User;
  next();
});

// ================= ROUTES =================

// BDApps USSD
router.post("/", controller.handleUSSD);

// BDApps Subscription
router.post("/subscription", controller.handleSubscription);

// ================= EXPORT =================
module.exports = router;
