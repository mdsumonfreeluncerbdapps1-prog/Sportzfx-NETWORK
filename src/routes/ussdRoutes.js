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

// ================= USSD MAIN =================
// 🔥 BDApps will hit: POST /ussd
router.post("/", async (req, res) => {
  console.log("🔥 USSD HIT:", req.body);

  const sessionId = req.body.sessionId || "";
  const text = req.body.message || ""; // user input
  const phone = req.body.sourceAddress || "";

  let response = "";

  try {
    // ================= MENU LOGIC =================

    if (text === "") {
      response = "1. Subscribe\n2. Check Status\n3. Exit";
    }

    else if (text === "1") {
      // subscribe user
      let user = await User.findOne({ phone });

      if (!user) {
        await User.create({ phone, active: true });
      } else {
        user.active = true;
        await user.save();
      }

      return res.json({
        message: "✅ Subscribed Successfully",
        ussdOperation: "mt-fin"
      });
    }

    else if (text === "2") {
      const user = await User.findOne({ phone });

      if (user && user.active) {
        response = "✅ You are Subscribed";
      } else {
        response = "❌ Not Subscribed";
      }
    }

    else if (text === "3") {
      return res.json({
        message: "Thank You!",
        ussdOperation: "mt-fin"
      });
    }

    else {
      response = "Invalid Option";
    }

    // ================= RESPONSE =================
    res.json({
      message: response,
      ussdOperation: "mt-cont"
    });

  } catch (err) {
    console.error(err);
    res.json({
      message: "Server Error",
      ussdOperation: "mt-fin"
    });
  }
});

// ================= SUBSCRIPTION CALLBACK =================
// 🔥 BDApps will hit: POST /subscription
router.post("/subscription", (req, res) => {
  console.log("🔥 SUBSCRIPTION HIT:", req.body);

  res.json({
    statusCode: "S1000",
    statusDetail: "Success"
  });
});

module.exports = router;
