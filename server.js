const express = require("express");
const axios = require("axios");
const config = require("./config.json");

const connectDB = require("./database/mongodb");
const Subscriber = require("./models/subscriber");
const { getSession } = require("./sessions/ussdSession");

const app = express();

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// FETCH MATCH DATA FROM NEW API
// =========================

async function fetchMatches(type) {

 try {

  const url = `https://cricbuzz.autoaiassistant.com/sms.php?message=${type}`;

  const response = await axios.get(url, { timeout: 5000 });

  const text = response.data || "No data available";

  // Convert API text to match object
  return [
   {
    match_name: type.toUpperCase() + " CRICKET",
    result: text
   }
  ];

 } catch (err) {

  console.log("API Error:", err.message);
  return [];

 }

}

// =========================
// FORMAT MATCH DETAILS
// =========================

function formatMatchInfo(match) {

 let text = "CON Match Information\n\n";

 const name = match.match_name || "Match";

 text += `${name}\n\n`;

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

 const list = session.matches.slice(start, end);

 let title = "Matches";

 if (session.type === "live") title = "Live Matches";
 if (session.type === "upcoming") title = "Upcoming Matches";
 if (session.type === "recent") title = "Recent Matches";

 let menu = `CON ${title}\n\n`;

 list.forEach((m, i) => {
  menu += `${i + 1}. ${m.match_name}\n`;
 });

 if (end < session.matches.length) {
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

  // MAIN MENU
  if (text === "") {

   session.menu = "main";
   session.page = 0;

   response =
    "CON Sportzfx NK\n\n" +
    "1 Live Matches\n" +
    "2 Upcoming Matches\n" +
    "3 Recent Matches";

  }

  // REFRESH
  else if (lastInput === "1" && session.menu === "score") {

   response = formatMatchInfo(session.selectedMatch);

  }

  // LIVE MATCHES
  else if (lastInput === "1" && session.menu === "main") {

   session.matches = await fetchMatches("live");

   if (!session.matches.length) {
    return res.send("END Server maintenance.\nTry later");
   }

   session.type = "live";
   session.page = 0;
   session.menu = "matches";

   response = showMatches(session);

  }

  // UPCOMING MATCHES
  else if (lastInput === "2") {

   session.matches = await fetchMatches("upcoming");

   if (!session.matches.length) {
    return res.send("END Server maintenance.\nTry later");
   }

   session.type = "upcoming";
   session.page = 0;
   session.menu = "matches";

   response = showMatches(session);

  }

  // RECENT MATCHES
  else if (lastInput === "3") {

   session.matches = await fetchMatches("recent");

   if (!session.matches.length) {
    return res.send("END Server maintenance.\nTry later");
   }

   session.type = "recent";
   session.page = 0;
   session.menu = "matches";

   response = showMatches(session);

  }

  // MORE MATCHES
  else if (lastInput === "9" && session.menu === "matches") {

   session.page++;

   response = showMatches(session);

  }

  // MATCH DETAILS
  else if (session.menu === "matches" && lastInput !== "0") {

   const index = session.page * 5 + (parseInt(lastInput) - 1);

   if (session.matches[index]) {

    const match = session.matches[index];

    session.selectedMatch = match;
    session.menu = "score";

    response = formatMatchInfo(match);

   } else {

    response = "END Invalid option";

   }

  }

  // BACK
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
// SUBSCRIPTION NOTIFICATION
// =========================

app.post("/subscription", async (req, res) => {

 try {

  const { msisdn, status } = req.body;

  console.log("Subscription Event:", req.body);

  if (status === "SUBSCRIBED") {

   await Subscriber.updateOne(
    { msisdn },
    { msisdn, status: "active" },
    { upsert: true }
   );

  }

  if (status === "UNSUBSCRIBED") {

   await Subscriber.updateOne(
    { msisdn },
    { status: "inactive" }
   );

  }

  res.status(200).send("OK");

 } catch (err) {

  console.log("Subscription Error:", err.message);
  res.status(200).send("OK");

 }

});

// =========================
// SUBSCRIBER COUNT API
// =========================

app.get("/subscribers", async (req, res) => {

 const total = await Subscriber.countDocuments({
  status: "active"
 });

 res.json({
  activeSubscribers: total
 });

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

// =========================
// CRASH PROTECTION
// =========================

process.on("uncaughtException", err => {
 console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", err => {
 console.error("Unhandled Rejection:", err);
});
