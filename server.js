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
// SAFE MATCH FETCH
// ======================

async function getMatchesSafe(type){
 try{
  const matches = await fetchMatches(type);
  if(!matches || !Array.isArray(matches)){
   return [];
  }
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
  // SUBSCRIBE FLOW (FIXED)
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

   const index = (session.page * 5) + (Number(lastInput) - 1);
   const match = session.matches[index];

   if(!match){
    return res.send("CON Invalid selection\n\n0 Back");
   }

   return res.send(
    "CON "+ parseMatchTitle(match).substring(0,30) +
    "\n\nScore update coming soon.\n\n0 Back"
   );
  }



  // ======================
  // PAGINATION SAFE
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



  // ======================
  // INVALID INPUT FIX
  // ======================

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
// SUBSCRIPTION CALLBACK
// ======================

app.post("/subscription", async (req,res)=>{

 try{

  const { subscriberId, status } = req.body;

  const msisdn = subscriberId.replace("tel:","");

  if(status === "REGISTERED"){

   await Subscriber.findOneAndUpdate(
    { msisdn },
    {
     msisdn,
     status:"active",
     subscribeDate:new Date()
    },
    { upsert:true }
   );
  }

  if(status === "UNREGISTERED"){

   await Subscriber.updateOne(
    { msisdn },
    { status:"inactive" }
   );
  }

  res.json({
   statusCode:"S1000",
   statusDetail:"Request was successfully processed"
  });

 }
 catch(err){

  res.json({
   statusCode:"E1000",
   statusDetail:"Server Error"
  });
 }
});


app.get("/",(req,res)=>{
 res.send("Sportzfx Network Running");
});


const PORT = process.env.PORT || config.server.port || 10000;

app.listen(PORT,()=>{
 console.log("Sportzfx server running on port",PORT);
});
