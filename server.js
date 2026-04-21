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

console.log("Starting Sportzfx server...");

connectDB();


// ======================
// MATCH LIST MENU
// ======================

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
  const number = i + 1;
  menu += `${number}. ${parseMatchTitle(m)}\n`;
 });

 if(end < (session.matches || []).length){
  menu += `\n9 More`;
 }

 menu += `\n0 Back`;

 return menu;

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

  console.log("====== USSD REQUEST ======");
  console.log("Session:", sessionId);
  console.log("Phone:", phone);
  console.log("Text:", text);
  console.log("==========================");

  const session = getSession(sessionId);

  const inputs = text.split("*");
  const lastInput = inputs[inputs.length - 1];

  const user = await Subscriber.findOne({ msisdn: phone });

  let response = "";


  // ======================
  // FIRST SCREEN
  // ======================

  if(text === ""){

   if(!user || user.status !== "active"){

    return res.send(
     "CON Welcome to Sportzfx Cricket\n\n"+
     "Get live cricket scores and updates.\n\n"+
     "1 Subscribe\n"+
     "0 Exit"
    );

   }

   return res.send(
    "CON Sportzfx Cricket\n\n"+
    "1 Live Matches\n"+
    "2 Upcoming Matches\n"+
    "3 Recent Matches\n"+
    "4 Unsubscribe\n"+
    "0 Exit"
   );

  }


  // ======================
  // SUBSCRIPTION FLOW
  // ======================

  if(text === "1" && (!user || user.status !== "active")){

   return res.send(
    "CON Confirm Subscription\n\n"+
    "Sportzfx Cricket Service\n"+
    "Daily charge Tk 2.67\n\n"+
    "1 Confirm\n"+
    "2 Cancel"
   );

  }

  if(text === "1*1" && (!user || user.status !== "active")){

   console.log("Subscription request:", phone);

   return res.send(
    "END Subscription request sent.\nConfirmation SMS will follow."
   );

  }

  if(text === "1*2"){
   return res.send("END Subscription cancelled");
  }


  // ======================
  // BLOCK NON-SUBSCRIBED USERS
  // ======================

  if(!user || user.status !== "active"){

   return res.send(
    "END Please subscribe first.\n\nDial *213*15755#"
   );

  }


  // ======================
  // LIVE MATCHES
  // ======================

  if(text === "1"){

   session.matches = await fetchMatches("live");
   session.page = 0;
   session.menu = "matches";
   session.title = "Live Matches";

   response = showMatches(session);

  }


  // ======================
  // UPCOMING MATCHES
  // ======================

  else if(text === "2"){

   session.matches = await fetchMatches("upcoming");
   session.page = 0;
   session.menu = "matches";
   session.title = "Upcoming Matches";

   response = showMatches(session);

  }


  // ======================
  // RECENT MATCHES
  // ======================

  else if(text === "3"){

   session.matches = await fetchMatches("recent");
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
    "END "+ parseMatchTitle(match) + "\n\nLive score coming soon."
   );

  }


  // ======================
  // PAGINATION
  // ======================

  else if(lastInput === "9" && session.menu === "matches"){

   session.page += 1;
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

   return res.send(
    "END You have successfully unsubscribed."
   );

  }


  // ======================
  // BACK TO MAIN MENU
  // ======================

  else if(lastInput === "0"){

   session.page = 0;
   session.menu = null;

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

  console.log("USSD ERROR:", err.message);

  res.send(
   "CON Service temporarily unavailable\n"+
   "Please try again later.\n\n"+
   "0 Back"
  );

 }

});


// ======================
// BDApps Subscription Notify
// ======================

app.post("/subscription", async (req,res)=>{

 try{

  console.log("BDApps Subscription:", req.body);

  const { subscriberId, status } = req.body;

  if(!subscriberId){
   return res.json({
    statusCode:"E1001",
    statusDetail:"Missing subscriberId"
   });
  }

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

   console.log("User Subscribed:", msisdn);

  }

  if(status === "UNREGISTERED"){

   await Subscriber.updateOne(
    { msisdn },
    { status:"inactive" }
   );

   console.log("User Unsubscribed:", msisdn);

  }

  res.json({
   statusCode:"S1000",
   statusDetail:"Request was successfully processed"
  });

 }
 catch(err){

  console.log("Subscription Error:", err);

  res.json({
   statusCode:"E1000",
   statusDetail:"Server Error"
  });

 }

});


// ======================
// HEALTH CHECK
// ======================

app.get("/",(req,res)=>{
 res.send("Sportzfx Network Running");
});


const PORT = process.env.PORT || config.server.port || 10000;

app.listen(PORT,()=>{
 console.log("Sportzfx server running on port",PORT);
});
