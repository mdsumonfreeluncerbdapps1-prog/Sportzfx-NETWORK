const express = require("express");
const router = express.Router();
const axios = require("axios");
const mongoose = require("mongoose");

// ================= DB CONNECT =================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected ✅"))
.catch(err => console.log("MongoDB Error:", err.message));

// ================= MODEL =================
const User = mongoose.model("User", {
  phone: { type: String, unique: true },
  active: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// ================= HEALTH =================
router.get("/", (req, res) => {
  res.send("USSD Server Running ✅");
});

// ================= USSD HANDLER =================
const handleUSSD = async (req, res) => {
  const { phoneNumber, text } = req.body;

  let response = "";

  try {
    const user = await User.findOne({ phone: phoneNumber });

    // 🔥 SUBSCRIPTION CHECK
    if (!user || !user.active) {
      if (!text) {
        response = `CON Please subscribe first
Dial *213*15755#
1. Retry`;
      } else {
        response = "END Subscription required";
      }

      res.set("Content-Type", "text/plain");
      return res.send(response);
    }

    // ===== MAIN MENU =====
    if (!text || text === "") {
      response = `CON Welcome to SportzFX BD
1. Live Score
2. Upcoming Match
3. Recent Match
4. Exit`;
    }

    // ===== LIVE =====
    else if (text === "1") {
      const r = await axios.get(process.env.LIVE_API, { timeout: 2000 });
      response = `END ${r.data}`;
    }

    // ===== UPCOMING =====
    else if (text === "2") {
      const r = await axios.get(process.env.UPCOMING_API, { timeout: 2000 });
      response = `END ${r.data}`;
    }

    // ===== RECENT =====
    else if (text === "3") {
      const r = await axios.get(process.env.RECENT_API, { timeout: 2000 });
      response = `END ${r.data}`;
    }

    // ===== EXIT =====
    else if (text === "4") {
      response = "END Thank you for using SportzFX";
    }

    else {
      response = "END Invalid option ❌";
    }

  } catch (err) {
    console.error("USSD ERROR:", err.message);
    response = "END Service temporarily unavailable";
  }

  res.set("Content-Type", "text/plain");
  res.send(response);
};

// ================= SUBSCRIPTION HANDLER =================
const handleSubscription = async (req, res) => {
  const { phoneNumber, status } = req.body;

  console.log("Subscription Hit:", req.body);

  try {
    if (status === "SUCCESS") {
      await User.findOneAndUpdate(
        { phone: phoneNumber },
        { active: true },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error("SUBSCRIPTION ERROR:", err.message);
  }

  res.set("Content-Type", "text/plain");
  res.send("OK");
};

// ================= ROUTES =================

// USSD
router.post("/ussd", handleUSSD);
router.post("/ussd/receive", handleUSSD);

// Subscription
router.post("/subscription", handleSubscription);
router.post("/subscription/receive", handleSubscription);

module.exports = router;
