const express = require("express");
const config = require("./config.json");

const connectDB = require("./database/mongodb");
const Subscriber = require("./models/subscriber");

const { fetchMatches } = require("./services/cricketApi");
const { parseMatchTitle } = require("./utils/parser");
const { getSession } = require("./sessions/ussdSession");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// SAFE STARTUP
// =========================

process.on("uncaughtException", err => {
 console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", err => {
 console.error("Unhandled Rejection:", err);
});

console.log("Starting server...");

// =========================
// CONNECT DATABASE
// =========================

try {
 connectDB();
} catch (err) {
 console.error("MongoDB Startup Error:", err.message);
}


// =========================
// FORMAT MATCH DETAILS
// =========================

function formatMatchInfo(match) {

 let text = "CON Match Information\n\n";

 const name = match.match_name || "Match";

 text += `${name}\n\n`;

 if (match.score && match.score.length) {

  match.score.forEach(s => {

   if (s.team_name && s.scores) {
    text += `${s.team_name} ${s.scores[0] || ""}\n`;
   }

  });

  text += "\n";
 }

 if (match.result) {
  text += `${match.result}\n\n`;
 }

 text += "1 Refresh\n0 Back";

 return text;

}


// =========================
// SHOW MATCH LIST
// =========================

function showMatches(session) {

 const start = session.page * 5;
 const end = start + 5;

 const list = (session.matches || []).slice(start, end);

 let title = "Matches";

 if (session.type === "live") title = "Live Matches";
 if (session.type === "upcoming") title = "Upcoming Matches";
 if (session.type === "recent") title = "Recent Matches";

 let menu = `CON ${title}\n\n`;

 list.forEach((m, i) => {
  menu += `${i + 1}. ${parseMatchTitle(m)}\n`;
 });

 if (end < (session.matches || []).length) {
  menu += `\n9 More Matches`;
 }

 menu += `\n0 Back`;

 return menu;

}


// =========================
// USSD LISTENER
// =========================

app.post("/ussd", async (req, res) => {

 try {

  const sessionId = req.body.sessionId || "demo";
  const text = req.body.text || "";

  const inputs = text.split("*");
  const lastInput = inputs[inputs.length - 1];

  const session = getSession(sessionId);

  let response = "";

  if (text === "") {

   session.menu = "main";
   session.page = 0;

   response =
    "CON Sportzfx NK\n\n" +
    "1 Live Matches\n" +
    "2 Upcoming Matches\n" +
    "3 Recent Matches";

  }

  else if (lastInput === "1" && session.menu === "main") {

   session.matches = await fetchMatches("live");

   session.type = "live";
   session.page = 0;
   session.menu = "matches";

   response = showMatches(session);

  }

  else if (lastInput === "2" && session.menu === "main") {

   session.matches = await fetchMatches("upcoming");

   session.type = "upcoming";
   session.page = 0;
   session.menu = "matches";

   response = showMatches(session);

  }

  else if (lastInput === "3" && session.menu === "main") {

   session.matches = await fetchMatches("recent");

   session.type = "recent";
   session.page = 0;
   session.menu = "matches";

   response = showMatches(session);

  }

  else if (lastInput === "9" && session.menu === "matches") {

   session.page++;

   response = showMatches(session);

  }

  else if (session.menu === "matches" && lastInput !== "0") {

   const index = session.page * 5 + (parseInt(lastInput) - 1);

   if (session.matches && session.matches[index]) {

    const match = session.matches[index];

    session.selectedMatch = match;
    session.menu = "score";

    response = formatMatchInfo(match);

   } else {

    response = "END Invalid option";

   }

  }

  else if (lastInput === "0") {

   session.menu = "main";
   session.page = 0;

   response =
    "CON Sportzfx NK\n\n" +
    "1 Live Matches\n" +
    "2 Upcoming Matches\n" +
    "3 Recent Matches";

  }

  else {

   response = "END Invalid option";

  }

  res.set("Content-Type", "text/plain");
  res.send(response);

 } catch (err) {

  console.log("USSD Error:", err.message);

  res.send("END Service temporarily unavailable");

 }

});


// =========================
// HEALTH CHECK
// =========================

app.get("/", (req, res) => {

 res.send("Sportzfx Network Running");

});


// =========================
// SERVER START
// =========================

const PORT = process.env.PORT || config.server.port || 10000;

app.listen(PORT, () => {

 console.log("Server running on", PORT);

});
