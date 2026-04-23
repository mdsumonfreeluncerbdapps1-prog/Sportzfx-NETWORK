const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// ================= MONGO CONNECT =================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
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

// ================= MIDDLEWARE (attach DB model) =================
router.use((req, res, next) => {
  req.User = User; // controller এ use করতে পারবা
  next();
});

// ================= ROUTES =================

// BDApps USSD callback
router.post("/", controller.handleUSSD);

// Subscription callback
router.post("/subscription", controller.handleSubscription);

module.exports = router;
