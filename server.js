const express = require("express");
const config = require("./config.json");

const { fetchMatches } = require("./services/cricketApi");
const { parseMatchTitle } = require("./utils/parser");
const { getSession } = require("./sessions/ussdSession");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// FORMAT MATCH DETAILS
// =========================

function formatMatchInfo(match){

 let text = "CON Match Information\n\n";

 const name = match.match_name || "Match";

 text += `${name}\n\n`;

 if(match.score && match.score.length){

  match.score.forEach(s=>{
   if(s.team_name && s.scores){
    text += `${s.team_name} ${s.scores[0] || ""}\n`;
   }
  });

  text += "\n";

 }

 if(match.result){
  text += `${match.result}\n\n`;
 }

 text += "1 Refresh\n0 Back";

 return text;

}

// =========================
// SHOW MATCH LIST
// =========================

function showMatches(session){

 const start = session.page * 5;
 const end = start + 5;

 const list = session.matches.slice(start,end);

 let title = "Matches";

 if(session.type === "live") title = "Live Matches";
 if(session.type === "upcoming") title = "Upcoming Matches";
 if(session.type === "recent") title = "Recent Matches";

 let menu = `CON ${title}\n\n`;

 list.forEach((m,i)=>{
  menu += `${i+1}. ${parseMatchTitle(m)}\n`;
 });

 if(end < session.matches.length){
  menu += `\n9 More Matches`;
 }

 menu += `\n0 Back`;

 return menu;

}

// =========================
// USSD LISTENER
// =========================

app.post("/ussd", async (req,res)=>{

 try{

  const sessionId = req.body.sessionId || "demo";
  const text = req.body.text || "";

  const session = getSession(sessionId);

  let response = "";

  // ================= MAIN MENU =================

  if(text === ""){

   session.menu = "main";
   session.page = 0;

   response =
   "CON Sportzfx NK\n\n" +
   "1 Live Matches\n" +
   "2 Upcoming Matches\n" +
   "3 Recent Matches";

  }

  // ================= LIVE =================

  else if(text === "1"){

   session.matches = await fetchMatches("live");

   if(!session.matches || session.matches.length === 0){
    return res.send("END Server maintenance.\nTry later");
   }

   session.type = "live";
   session.page = 0;
   session.menu = "matches";

   response = showMatches(session);

  }

  // ================= UPCOMING =================

  else if(text === "2"){

   session.matches = await fetchMatches("upcoming");

   if(!session.matches || session.matches.length === 0){
    return res.send("END Server maintenance.\nTry later");
   }

   session.type = "upcoming";
   session.page = 0;
   session.menu = "matches";

   response = showMatches(session);

  }

  // ================= RECENT =================

  else if(text === "3"){

   session.matches = await fetchMatches("recent");

   if(!session.matches || session.matches.length === 0){
    return res.send("END Server maintenance.\nTry later");
   }

   session.type = "recent";
   session.page = 0;
   session.menu = "matches";

   response = showMatches(session);

  }

  // ================= PAGINATION =================

  else if(text === "9" && session.menu === "matches"){

   session.page++;

   response = showMatches(session);

  }

  // ================= MATCH SELECT =================

  else if(session.menu === "matches" && text !== "0"){

   const index = session.page * 5 + (parseInt(text) - 1);

   if(session.matches[index]){

    const match = session.matches[index];

    session.selectedMatch = match;
    session.menu = "score";

    response = formatMatchInfo(match);

   }else{

    response = "END Invalid option";

   }

  }

  // ================= REFRESH =================

  else if(text === "1" && session.menu === "score"){

   response = formatMatchInfo(session.selectedMatch);

  }

  // ================= BACK =================

  else if(text === "0"){

   session.menu = "main";

   response =
   "CON Sportzfx NK\n\n" +
   "1 Live Matches\n" +
   "2 Upcoming Matches\n" +
   "3 Recent Matches";

  }

  else{

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

app.get("/",(req,res)=>{
 res.send("Sportzfx Network Running");
});

// =========================
// SERVER START
// =========================

const PORT = process.env.PORT || config.server.port || 10000;

app.listen(PORT,()=>{
 console.log("Server running on",PORT);
});

// =========================
// CRASH PROTECTION
// =========================

process.on("uncaughtException",err=>{
 console.error("Uncaught Exception:",err);
});

process.on("unhandledRejection",err=>{
 console.error("Unhandled Rejection:",err);
});
