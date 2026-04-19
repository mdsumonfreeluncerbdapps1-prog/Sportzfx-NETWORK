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
// MATCH LIST
// =========================

function showMatches(session){

 const start = session.page * 5;
 const end = start + 5;

 const list = (session.matches || []).slice(start,end);

 let menu = `CON ${session.title}\n\n`;

 if(list.length === 0){
  return (
   "CON No Matches Available\n\n"+
   "Please try again later.\n"+
   "0 Back"
  );
 }

 list.forEach((m,i)=>{
  const number = start + i + 1;
  menu += `${number}. ${parseMatchTitle(m)}\n`;
 });

 if(end < (session.matches || []).length){
  menu += `\n9 More Matches`;
 }

 menu += `\n0 Back`;

 return menu;

}


// =========================
// USSD ENDPOINT
// =========================

app.post("/ussd", async (req,res)=>{

 try{

  res.set("Content-Type","text/plain");

  const sessionId = req.body.sessionId;
  const phone = req.body.phoneNumber || req.body.msisdn;
  const text = req.body.text || "";

  const session = getSession(sessionId);

  const inputs = text.split("*");
  const lastInput = inputs[inputs.length - 1];

  const user = await Subscriber.findOne({ msisdn: phone });

  let response = "";

  // MAIN MENU
  if(text === ""){

   if(!user || user.status !== "active"){

    response =
    "CON Sportzfx Cricket\n\n"+
    "1 Subscribe\n"+
    "0 Exit";

   }else{

    response =
    "CON Sportzfx Cricket\n\n"+
    "1 Live Matches\n"+
    "2 Upcoming Matches\n"+
    "3 Recent Matches\n"+
    "4 Unsubscribe\n"+
    "0 Exit";

   }

   return res.send(response);

  }

  // SUBSCRIBE FLOW
  if(text === "1" && (!user || user.status !== "active")){

   response =
   "CON Confirm Subscription\n\n"+
   "Sportzfx Cricket Service\n"+
   "Daily charge Tk 2.67\n\n"+
   "1 Confirm\n"+
   "2 Cancel";

   return res.send(response);

  }

  if(text === "1*1" && (!user || user.status !== "active")){

   return res.send(
    "END Subscription request sent.\nYou will receive confirmation SMS shortly."
   );

  }

  if(text === "1*2"){
   return res.send("END Subscription cancelled");
  }

  // BLOCK NON SUBSCRIBER
  if(!user || user.status !== "active"){

   return res.send(
    "END Please subscribe first\nDaily charge Tk 2.67\nDial *213*15755#"
   );

  }

  // LIVE MATCHES
  if(lastInput === "1"){

   session.matches = await fetchMatches("live");
   session.page = 0;
   session.menu = "matches";
   session.title = "Live Matches";

   response = showMatches(session);

  }

  // UPCOMING MATCHES
  else if(lastInput === "2"){

   session.matches = await fetchMatches("upcoming");
   session.page = 0;
   session.menu = "matches";
   session.title = "Upcoming Matches";

   response = showMatches(session);

  }

  // RECENT MATCHES
  else if(lastInput === "3"){

   session.matches = await fetchMatches("recent");
   session.page = 0;
   session.menu = "matches";
   session.title = "Recent Matches";

   response = showMatches(session);

  }

  // UNSUBSCRIBE
  else if(lastInput === "4"){

   await Subscriber.updateOne(
    { msisdn: phone },
    { status: "inactive" }
   );

   return res.send(
    "END You have successfully unsubscribed from Sportzfx Cricket Service."
   );

  }

  // MORE MATCHES
  else if(lastInput === "9" && session.menu === "matches"){

   session.page += 1;
   response = showMatches(session);

  }

  // BACK
  else if(lastInput === "0"){

   return res.send(
    "CON Sportzfx Cricket\n\n"+
    "1 Live Matches\n"+
    "2 Upcoming Matches\n"+
    "3 Recent Matches\n"+
    "4 Unsubscribe\n"+
    "0 Exit"
   );

  }

  res.send(response);

 }
 catch(err){

  console.log("USSD Error:",err.message);

  res.send(
   "CON Service temporarily unavailable\n"+
   "Please try again later.\n\n"+
   "0 Back"
  );

 }

});


// =========================
// SUBSCRIPTION CALLBACK
// =========================

app.post("/subscription", async (req,res)=>{

 try{

  let { msisdn, status } = req.body;

  console.log("Subscription Event:", req.body);

  if(!msisdn){
   return res.send("OK");
  }

  if(msisdn.startsWith("0")){
   msisdn = "88" + msisdn;
  }

  const allowedPrefixes = ["88016","88018"];

  if(!allowedPrefixes.some(p => msisdn.startsWith(p))){
   console.log("Operator not supported:", msisdn);
   return res.send("OK");
  }

  if(status === "SUBSCRIBED"){

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

  if(status === "UNSUBSCRIBED"){

   await Subscriber.updateOne(
    { msisdn },
    { status:"inactive" }
   );

  }

  res.send("OK");

 }
 catch(err){

  console.log("Subscription Error:", err.message);
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
