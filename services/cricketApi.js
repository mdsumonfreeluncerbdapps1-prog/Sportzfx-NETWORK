const express = require("express");
const config = require("./config.json");

const { fetchMatches } = require("./services/cricketApi");
const { parseMatchTitle } = require("./utils/parser");
const { getSession } = require("./sessions/ussdSession");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// USSD LISTENER
// =========================

app.post("/ussd", async (req, res) => {

 try{

  const sessionId = req.body.sessionId || "demo";
  const text = req.body.text || "";

  const session = getSession(sessionId);

  let response = "";

  // ================= MAIN MENU =================

  if (text === "") {

   session.menu = "main";

   response =
    "CON Sportzfx NK\n\n" +
    "1 Live Matches\n" +
    "2 Upcoming Matches\n" +
    "3 Recent Matches";

  }

  // ================= LIVE MATCHES =================

  else if (text === "1") {

   const matches = await fetchMatches("live");

   let menu = "CON Live Matches\n\n";

   matches.slice(0,5).forEach((m,i)=>{

    menu += `${i+1}. ${parseMatchTitle(m)}\n`;

   });

   menu += "\n0 Back";

   response = menu;

  }

  // ================= UPCOMING =================

  else if (text === "2") {

   const matches = await fetchMatches("upcoming");

   let menu = "CON Upcoming Matches\n\n";

   matches.slice(0,5).forEach((m,i)=>{

    menu += `${i+1}. ${parseMatchTitle(m)}\n`;

   });

   menu += "\n0 Back";

   response = menu;

  }

  // ================= RECENT =================

  else if (text === "3") {

   const matches = await fetchMatches("recent");

   let menu = "CON Recent Matches\n\n";

   matches.slice(0,5).forEach((m,i)=>{

    menu += `${i+1}. ${parseMatchTitle(m)}\n`;

   });

   menu += "\n0 Back";

   response = menu;

  }

  else {

   response = "END Invalid option";

  }

  res.send(response);

 }catch(err){

  console.log("USSD Error:",err.message);

  res.send("END Service temporarily unavailable");

 }

});

// =========================
// HEALTH CHECK
// =========================

app.get("/", (req,res)=>{
 res.send("Sportzfx Network Running");
});

// =========================
// SERVER START
// =========================

const PORT = process.env.PORT || config.server.port || 10000;

app.listen(PORT, ()=>{

 console.log("Server running on", PORT);

});
