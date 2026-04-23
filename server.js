const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

// middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// test route (optional)
app.get('/', (req, res) => {
    res.send("SportzFX USSD Server Running ✅");
});

// USSD route (BDApps)
app.post('/ussd', async (req, res) => {
    const { text } = req.body;

    let response = "";

    try {
        // MAIN MENU
        if (text === "") {
            response = `CON Welcome to SportzFX ⚽
1. Live Score
2. Match List
3. Exit`;
        }

        // LIVE SCORE
        else if (text === "1") {
            const api = await axios.get("https://cricbuzz.autoaiassistant.com/api.php");

            let matches = api.data.slice(0, 5); // first 5 matches

            let msg = "CON Live Matches:\n";

            matches.forEach((m, i) => {
                msg += `${i + 1}. ${m.team1} vs ${m.team2}\n`;
            });

            msg += "\n0. Back";

            response = msg;
        }

        // MATCH LIST
        else if (text === "2") {
            const api = await axios.get("https://cricbuzz.autoaiassistant.com/api.php");

            let matches = api.data.slice(0, 5);

            let msg = "END Match List:\n";

            matches.forEach((m, i) => {
                msg += `${m.team1} vs ${m.team2}\n`;
            });

            response = msg;
        }

        // BACK
        else if (text === "1*0") {
            response = `CON Welcome to SportzFX ⚽
1. Live Score
2. Match List
3. Exit`;
        }

        // EXIT
        else if (text === "3") {
            response = "END Thank you for using SportzFX 🙏";
        }

        else {
            response = "END Invalid Option ❌";
        }

    } catch (error) {
        console.log(error.message);
        response = "END Server Error ❌ Try again later";
    }

    res.set('Content-Type', 'text/plain');
    res.send(response);
});

// start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
