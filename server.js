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

connectDB();


// ======================
// API CACHE (10 sec)
// ======================

const matchCache = {
 live: { data: [], time: 0 },
 upcoming: { data: [], time: 0 },
 recent: { data: [], time: 0 }
};

const CACHE_TIME = 10000;


// ======================
// SAFE MATCH FETCH
// ======================

async function getMatchesSafe(type){

 try{

  const now = Date.now();

  if(now - matchCache[type].time < CACHE_TIME){
   return matchCache[type].data;
  }

  const matches = await fetchMatches(type);

  if(!matches || !Array.isArray(matches)){
   return [];
  }

  matchCache[type] = {
   data: matches,
   time: now
  };

  return matches;

 }catch(err){

  console.log("Match API error:",err.message);
  return [];
 }
}


// ======================
// MATCH LIST MENU
// ======================

function showMatches(session){

 const matches = session.matches || [];

 if(matches.length === 0){
  return "CON No matches available\n\n0 Back";
 }

 const start = session.page * 5;
 const end = start + 5;

 const list = matches.slice(start,end);

 if(list.length === 0){
  return "CON No More Matches\n\n0 Back";
 }

 let menu = `CON ${session.title}\n\n`;

 list.forEach((m,i)=>{
  const title = parseMatchTitle(m).substring(0,30);
  menu += `${i+1}. ${title}\n`;
 });

 if(end < matches.length){
  menu += `\n9 More Matches`;
 }

 menu += `\n0 Back`;

 return menu;
}


// ======================
// MAIN MENU
// ======================

function mainMenu(){

 return (
  "CON Sportzfx Cricket\n\n"+
  "1 Live Matches\n"+
  "2 Upcoming Matches\n"+
  "3 Recent Matches\n"+
  "4 Unsubscribe\n"+
  "0 Exit"
 );

}


// ======================
// USSD ENDPOINT
// ======================

app.post("/ussd", async (req,res)=>{

 try{

  res.set("Content-Type","text/plain");

  const sessionId = req.body.sessionId;
  const phone = req.body.phoneNumber || req.body.msisdn || "";
  const text = req.body.text || "";

  const session = getSession(sessionId);

  const inputs = text.split("*");
  const lastInput = inputs[inputs.length - 1];

  const user = await Subscriber.findOne({ msisdn: phone }).lean();

  let response = "";


  // ======================
  // SESSION START
  // ======================

  if(text === ""){

   if(!user || user.status !== "active"){

    return res.send(
     "CON Welcome to Sportzfx Cricket\n\n"+
     "Get live cricket scores and updates.\n\n"+
     "5 Subscribe\n"+
     "0 Exit"
    );

   }

   return res.send(mainMenu());
  }


  // ======================
  // EXIT
  // ======================

  if(text === "0"){
   return res.send("END Thank you for using Sportzfx Cricket.");
  }


  // ======================
  // SUBSCRIBE FLOW
  // ======================

  if(text === "5" && (!user || user.status !== "active")){

   return res.send(
    "CON Confirm Subscription\n\n"+
    "Sportzfx Cricket Service\n"+
    "Daily charge Tk 2.67\n\n"+
    "1 Confirm\n"+
    "2 Cancel\n"+
    "0 Back"
   );
  }

  if(text === "5*1"){
   return res.send(
    "END Subscription request sent.\nConfirmation SMS will follow."
   );
  }

  if(text === "5*2"){
   return res.send("END Subscription cancelled");
  }


  // ======================
  // BLOCK NON SUBSCRIBERS
  // ======================

  if(!user || user.status !== "active"){

   return res.send(
    "END Please subscribe first.\n\nDial *213*15755#"
   );

  }


  // ======================
  // BACK
  // ======================

  if(lastInput === "0" && session.menu === "matches"){

   session.page = 0;
   session.matches = [];
   session.menu = null;
   session.selectedMatch = null;

   return res.send(mainMenu());
  }


  // ======================
  // LIVE MATCHES
  // ======================

  if(text === "1"){

   session.matches = await getMatchesSafe("live");

   session.page = 0;
   session.menu = "matches";
   session.title = "Live Matches";

   response = showMatches(session);
  }


  // ======================
  // UPCOMING MATCHES
  // ======================

  else if(text === "2"){

   session.matches = await getMatchesSafe("upcoming");

   session.page = 0;
   session.menu = "matches";
   session.title = "Upcoming Matches";

   response = showMatches(session);
  }


  // ======================
  // RECENT MATCHES
  // ======================

  else if(text === "3"){

   session.matches = await getMatchesSafe("recent");

   session.page = 0;
   session.menu = "matches";
   session.title = "Recent Matches";

   response = showMatches(session);
  }


  // ======================
  // MATCH DETAILS
  // ======================

  else if(session.menu === "matches" && Number(lastInput) >= 1 && Number(lastInput) <= 5){

   session.selectedMatch = (session.page * 5) + (Number(lastInput) - 1);

   const match = session.matches[session.selectedMatch];

   if(!match){
    return res.send("CON Invalid selection\n\n0 Back");
   }

   const title = parseMatchTitle(match).substring(0,30);
   const team1 = match.team1Score || "";
   const team2 = match.team2Score || "";
   const status = match.status || "Score updating...";

   return res.send(
    "CON " + title +
    "\n\n" + team1 +
    "\n" + team2 +
    "\n\n" + status +
    "\n\n1 Refresh\n0 Back"
   );
  }


  // ======================
  // REFRESH SCORE
  // ======================

  else if(lastInput === "1"){

   if(session.selectedMatch === null || session.selectedMatch === undefined){
    return res.send("CON Session expired\n\n0 Back");
   }

   const matches = await getMatchesSafe("live");

   const match = matches[session.selectedMatch];

   if(!match){
    return res.send("CON Score unavailable\n\n0 Back");
   }

   const title = parseMatchTitle(match).substring(0,30);
   const team1 = match.team1Score || "";
   const team2 = match.team2Score || "";
   const status = match.status || "Score updating...";

   return res.send(
    "CON " + title +
    "\n\n" + team1 +
    "\n" + team2 +
    "\n\n" + status +
    "\n\n1 Refresh\n0 Back"
   );
  }


  // ======================
  // PAGINATION
  // ======================

  else if(lastInput === "9" && session.menu === "matches"){

   if((session.page + 1) * 5 < session.matches.length){
    session.page += 1;
   }

   response = showMatches(session);
  }


  // ======================
  // UNSUBSCRIBE
  // ======================

  else if(lastInput === "4"){

   await Subscriber.updateOne(
    { msisdn: phone },
    { status: "inactive" }
   );

   return res.send("END You have successfully unsubscribed.");
  }


  if(!response){
   response = "CON Invalid selection\n\n0 Back";
  }

  res.send(response);

 }
 catch(err){

  console.log("USSD ERROR:",err.message);

  res.send(
   "CON Service temporarily unavailable\n"+
   "Please try again later.\n\n"+
   "0 Back"
  );
 }
});


// ======================
// SERVER START
// ======================

const PORT = config.port || 10000;

app.listen(PORT,()=>{
 console.log("USSD server running on port",PORT);
});
