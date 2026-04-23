const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= MIDDLEWARE =================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ================= CONFIG =================
const CONFIG = {
  APP_NAME: "SportzFX",
  LIVE_API: "https://cricbuzz.autoaiassistant.com/sms.php?message=live",
  UPCOMING_API: "https://cricbuzz.autoaiassistant.com/sms.php?message=upcoming",
  RECENT_API: "https://cricbuzz.autoaiassistant.com/sms.php?message=recent"
};

// ================= ROOT =================
app.get('/', (req, res) => {
  res.send(`${CONFIG.APP_NAME} Running ✅`);
});

// ================= USSD =================
app.post('/ussd', async (req, res) => {
  const { phoneNumber, text } = req.body;

  let response = "";

  try {

    // ===== MAIN MENU =====
    if (!text || text === "") {
      response = `CON Welcome to ${CONFIG.APP_NAME} ⚽
1. Live Score
2. Upcoming Match
3. Recent Match
4. Exit`;
    }

    // ===== LIVE SCORE =====
    else if (text === "1") {
      const r = await axios.get(CONFIG.LIVE_API, { timeout: 2000 });
      response = `END ${r.data}`;
    }

    // ===== UPCOMING =====
    else if (text === "2") {
      const r = await axios.get(CONFIG.UPCOMING_API, { timeout: 2000 });
      response = `END ${r.data}`;
    }

    // ===== RECENT =====
    else if (text === "3") {
      const r = await axios.get(CONFIG.RECENT_API, { timeout: 2000 });
      response = `END ${r.data}`;
    }

    // ===== EXIT =====
    else if (text === "4") {
      response = `END Thank you for using ${CONFIG.APP_NAME}`;
    }

    // ===== INVALID =====
    else {
      response = "END Invalid Option ❌";
    }

  } catch (err) {
    console.error("USSD ERROR:", err.message);
    response = "END Service temporarily unavailable";
  }

  res.set('Content-Type', 'text/plain');
  res.send(response);
});

// ================= SUBSCRIPTION =================
app.post('/subscription', (req, res) => {
  console.log("Subscription Hit:", req.body);

  // production এ এখানে DB logic add করবে
  res.set('Content-Type', 'text/plain');
  res.send("OK");
});

// ================= HEALTH =================
app.get('/health', (req, res) => {
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
