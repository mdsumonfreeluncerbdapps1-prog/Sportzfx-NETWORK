const express = require("express");
const router = express.Router();
const axios = require("axios");
const mongoose = require("mongoose");

// ================= DB CONNECT =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("MongoDB Error:", err.message));

// ================= MODEL =================
const User = mongoose.model("User", {
  phone: { type: String, unique: true },
  active: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// ================= NUMBER NORMALIZER =================
const normalizeNumber = (num) => {
  if (!num) return "";

  if (num.startsWith("+880")) return "0" + num.slice(4);
  if (num.startsWith("880")) return "0" + num.slice(3);

  return num;
};

// ================= HEALTH =================
router.get("/", (req, res) => {
  res.send("USSD Server Running ✅");
});

// ================= USSD HANDLER =================
const handleUSSD = async (req, res) => {

  const phoneRaw = req.body.phoneNumber || req.body.msisdn;
  const phone = normalizeNumber(phoneRaw);
  const text = req.body.text || "";

  let response = "";

  try {
    const user = await User.findOne({ phone });

    // 🔴 SUBSCRIPTION CHECK
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

    // ===== MENU =====
    if (text === "") {
      response = `CON Welcome to SportzFX ⚽
1. Live Score
2. Upcoming Match
3. Recent Match
4. Exit`;
    }

    else if (text === "1") {
      const r = await axios.get(process.env.LIVE_API, { timeout: 3000 });
      response = `END ${r.data}`;
    }

    else if (text === "2") {
      const r = await axios.get(process.env.UPCOMING_API, { timeout: 3000 });
      response = `END ${r.data}`;
    }

    else if (text === "3") {
      const r = await axios.get(process.env.RECENT_API, { timeout: 3000 });
      response = `END ${r.data}`;
    }

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

  const phoneRaw = req.body.phoneNumber || req.body.msisdn;
  const phone = normalizeNumber(phoneRaw);
  const status = req.body.status;

  console.log("Subscription Hit:", phone, status);

  try {
    if (status === "SUCCESS") {
      await User.findOneAndUpdate(
        { phone },
        { active: true },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error("SUB ERROR:", err.message);
  }

  res.set("Content-Type", "text/plain");
  res.send("OK");
};

// ================= ROUTES =================
router.post("/ussd", handleUSSD);
router.post("/ussd/receive", handleUSSD);

router.post("/subscription", handleSubscription);
router.post("/subscription/receive", handleSubscription);

module.exports = router;
