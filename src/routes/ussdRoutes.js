const express = require("express");
const router = express.Router();
const axios = require("axios");

// ================= TEMP USER STORE =================
const users = {};

// ================= HEALTH =================
router.get("/", (req, res) => {
  res.send("USSD Server Running ✅");
});

// ================= COMMON USSD HANDLER =================
const handleUSSD = async (req, res) => {
  const { phoneNumber, text } = req.body;

  let response = "";

  try {

    // 🔥 SUBSCRIPTION CHECK
    if (!users[phoneNumber]) {
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
    if (!text || text === "") {
      response = `CON Welcome to SportzFX BD
1. Live Score
2. Upcoming Match
3. Recent Match
4. Exit`;
    }

    else if (text === "1") {
      const r = await axios.get("https://cricbuzz.autoaiassistant.com/sms.php?message=live", { timeout: 2000 });
      response = `END ${r.data}`;
    }

    else if (text === "2") {
      const r = await axios.get("https://cricbuzz.autoaiassistant.com/sms.php?message=upcoming", { timeout: 2000 });
      response = `END ${r.data}`;
    }

    else if (text === "3") {
      const r = await axios.get("https://cricbuzz.autoaiassistant.com/sms.php?message=recent", { timeout: 2000 });
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

// ================= COMMON SUBSCRIPTION HANDLER =================
const handleSubscription = (req, res) => {
  const { phoneNumber, status } = req.body;

  console.log("Subscription Hit:", req.body);

  if (status === "SUCCESS") {
    users[phoneNumber] = true;
  }

  res.set("Content-Type", "text/plain");
  res.send("OK");
};

// ================= ROUTES =================

// USSD (both)
router.post("/ussd", handleUSSD);
router.post("/ussd/receive", handleUSSD);

// Subscription (both)
router.post("/subscription", handleSubscription);
router.post("/subscription/receive", handleSubscription);

module.exports = router;
