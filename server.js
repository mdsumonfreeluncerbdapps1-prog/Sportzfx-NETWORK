const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// root check
app.get('/', (req, res) => {
    res.send("SportzFX USSD Server Running ✅");
});

// ==============================
// 🔥 BDApps USSD ROUTE
// ==============================
app.post('/ussd', async (req, res) => {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    let response = "";

    try {

        // MAIN MENU
        if (!text || text === "") {
            response = `CON Welcome to SportzFX ⚽
1. Live Score
2. Match List
3. Exit`;
        }

        // =========================
        // LIVE SCORE MENU
        // =========================
        else if (text === "1") {
            const api = await axios.get("https://cricbuzz.autoaiassistant.com/api.php");

            let matches = api.data.slice(0, 5);

            let msg = "CON Live Matches:\n";

            matches.forEach((m, i) => {
                msg += `${i + 1}. ${m.team1} vs ${m.team2}\n`;
            });

            msg += "\n0. Back";

            response = msg;
        }

        // =========================
        // MATCH DETAILS
        // =========================
        else if (text.startsWith("1*")) {

            // BACK
            if (text === "1*0") {
                response = `CON Welcome to SportzFX ⚽
1. Live Score
2. Match List
3. Exit`;
            } 
            else {
                const index = parseInt(text.split("*")[1]) - 1;

                const api = await axios.get("https://cricbuzz.autoaiassistant.com/api.php");
                let matches = api.data;

                if (matches[index]) {
                    let m = matches[index];

                    response = `END ${m.team1} vs ${m.team2}
Score: ${m.score || "Updating..."}`;
                } else {
                    response = "END Invalid Match ❌";
                }
            }
        }

        // =========================
        // MATCH LIST
        // =========================
        else if (text === "2") {
            const api = await axios.get("https://cricbuzz.autoaiassistant.com/api.php");

            let matches = api.data.slice(0, 5);

            let msg = "END Match List:\n";

            matches.forEach((m) => {
                msg += `${m.team1} vs ${m.team2}\n`;
            });

            response = msg;
        }

        // =========================
        // EXIT
        // =========================
        else if (text === "3") {
            response = "END Thank you for using SportzFX 🙏";
        }

        // =========================
        // INVALID
        // =========================
        else {
            response = "END Invalid Option ❌";
        }

    } catch (error) {
        console.error("ERROR:", error.message);
        response = "END Server Error ❌ Try again later";
    }

    // 🔥 BDApps MUST REQUIRE
    res.set('Content-Type', 'text/plain');
    res.send(response);
});

// fallback (important for debug)
app.use((req, res) => {
    res.status(404).send("Route not found");
});

// start server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
