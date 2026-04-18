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

console.log("Starting server...");

connectDB();


// =========================
// MATCH DETAILS
// =========================

function formatMatchInfo(match){

 let text = "CON Match Information\n\n";

 const name = match.match_name || "Match";

 text += `${name}\n\n`;

 if(match.score && match.score.length){

  match.score.forEach(s => {

   if(s.team_name && s.scores){
    text += `${s.team_name} ${s.scores[0] || ""}\n`;
   }

  });

  text += "\n";
 }

 if(match.result){
  text += `${match.result}\n\n`;
 }

 text += "0 Back";

 return text;

}


// =========================
// MATCH LIST
// =========================

function showMatches(session){

 const start = session.page * 5;
 const end = start + 5;

 const list = (session.matches || []).slice(start,end);

 let menu = `CON Cricket Matches\n\n`;

 list.forEach((m,i)=>{
  menu += `${i+1}. ${parseMatchTitle(m)}\n`;
 });

 if(end < (session.matches || []).length){
  menu += `\n9 More`;
 }

 menu += `\n0 Back`;

 return menu;

}


// =========================
// USSD ENDPOINT
// =========================

app.post("/ussd", async (req,res)=>{

 try{

  const sessionId = req.body.sessionId;
  const phone = req.body.phoneNumber || req.body.msisdn;
  const text = req.body.text || "";

  const session = getSession(sessionId);

  const inputs = text.split("*");
  const lastInput = inputs[inputs.length - 1];

  let response = "";

  // =========================
  // FIRST MENU
  // =========================

  if(text === ""){

   response =
   "CON Sportzfx Cricket\n\n"+
   "1 Subscribe\n"+
   "2 Live Matches\n"+
   "3 Upcoming Matches\n"+
   "4 Recent Matches\n"+
   "0 Exit";

   return res.send(response);

  }

  // =========================
  // SUBSCRIBE CONFIRM
  // =========================

  if(text === "1"){

   response =
   "CON Confirm Subscription\n\n"+
   "Sportzfx Cricket Service\n"+
   "Daily charge Tk 2.67\n\n"+
   "1 Confirm\n"+
   "2 Cancel";

   return res.send(response);

  }

  if(text === "1*1"){

   response =
   "END Subscription request sent.\n"+
   "You will receive confirmation SMS shortly.";

   return res.send(response);

  }

  if(text === "1*2"){

   return res.send("END Subscription cancelled");

  }


  // =========================
  // CHECK SUBSCRIBER
  // =========================

  const user = await Subscriber.findOne({ msisdn: phone });

  if(!user || user.status !== "active"){

   return res.send(
    "END Please subscribe first\nDaily charge Tk 2.67\nDial *213*15755#"
   );

  }


  // =========================
  // LIVE MATCHES
  // =========================

  if(lastInput === "2"){

   session.matches = await fetchMatches("live");

   session.page = 0;
   session.menu = "matches";

   response = showMatches(session);

  }

  else if(lastInput === "3"){

   session.matches = await fetchMatches("upcoming");

   session.page = 0;
   session.menu = "matches";

   response = showMatches(session);

  }

  else if(lastInput === "4"){

   session.matches = await fetchMatches("recent");

   session.page = 0;
   session.menu = "matches";

   response = showMatches(session);

  }

  res.set("Content-Type","text/plain");
  res.send(response);

 }
 catch(err){

  console.log("USSD Error:",err.message);

  res.send("END Service temporarily unavailable");

 }

});


// =========================
// SUBSCRIPTION NOTIFICATION
// =========================

app.post("/subscription", async (req,res)=>{

 try{

  const { msisdn, status } = req.body;

  console.log("Subscription Event:",req.body);

  if(status === "SUBSCRIBED"){

   await Subscriber.updateOne(
    { msisdn },
    { msisdn, status:"active" },
    { upsert:true }
   );

  }

  if(status === "UNSUBSCRIBED"){

   await Subscriber.updateOne(
    { msisdn },
    { status:"inactive" }
   );

  }

  res.send("OK");

 }
 catch(err){

  console.log("Subscription Error:",err.message);
  res.send("OK");

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
