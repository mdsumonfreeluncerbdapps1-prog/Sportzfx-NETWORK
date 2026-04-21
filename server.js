const express = require("express");
const config = require("./config.json");
const axios = require("axios");

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
   "CON No Matches\n\n"+
   "0 Back"
  );

 }

 list.forEach((m,i)=>{

  const number = i + 1;

  menu += `${number} ${parseMatchTitle(m)}\n`;

 });

 menu += `\n9 Refresh`;
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
     "CON Sportzfx Cricket\n\n"+
     "1 Subscribe\n"+
     "0 Exit"
    );

   }

   return res.send(
    "CON Sportzfx Cricket\n\n"+
    "1 Live\n"+
    "2 Upcoming\n"+
    "3 Recent\n"+
    "4 Unsub\n"+
    "0 Exit"
   );

  }


  // ======================
  // SUBSCRIPTION FLOW
  // ======================

  if(text === "1" && (!user || user.status !== "active")){

   return res.send(
    "CON Sportzfx Cricket\n\n"+
    "Tk2.67/day\n\n"+
    "1 Confirm\n"+
    "2 Cancel"
   );

  }

  if(text === "1*1" && (!user || user.status !== "active")){

   console.log("Subscription request:", phone);

   return res.send(
    "END Subscription request sent"
   );

  }

  if(text === "1*2"){
   return res.send("END Cancelled");
  }


  // ======================
  // BLOCK NON-SUBSCRIBED USERS
  // ======================

  if(!user || user.status !== "active"){

   return res.send(
    "END Please subscribe\nDial *213*15755#"
   );

  }


  // ======================
  // LIVE MATCHES
  // ======================

  if(text === "1"){

   session.matches = await fetchMatches("live");
   session.page = 0;
   session.menu = "matches";
   session.title = "Live";

   response = showMatches(session);

  }


  // ======================
  // UPCOMING MATCHES
  // ======================

  else if(text === "2"){

   session.matches = await fetchMatches("upcoming");
   session.page = 0;
   session.menu = "matches";
   session.title = "Upcoming";

   response = showMatches(session);

  }


  // ======================
  // RECENT MATCHES
  // ======================

  else if(text === "3"){

   session.matches = await fetchMatches("recent");
   session.page = 0;
   session.menu = "matches";
   session.title = "Recent";

   response = showMatches(session);

  }


  // ======================
  // MATCH DETAILS
  // ======================

  else if(session.menu === "matches" && Number(lastInput) >= 1 && Number(lastInput) <= 5){

   const index = (session.page * 5) + (Number(lastInput) - 1);
   const match = session.matches[index];

   if(!match){
    return res.send("CON Invalid\n0 Back");
   }

   let score = "Score loading...";

   try{

    const api = await axios.get(
     "https://cricbuzz.autoaiassistant.com/sms.php?message=1"
    );

    if(api.data){
     score = api.data;
    }

   }catch(err){

    console.log("Score API error:", err.message);

   }

   return res.send(
    "CON "+ parseMatchTitle(match) + "\n\n"+
    score + "\n\n"+
    "0 Back"
   );

  }


  // ======================
  // REFRESH
  // ======================

  else if(lastInput === "9" && session.menu === "matches"){

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
    "END Unsubscribed"
   );

  }


  // ======================
  // BACK
  // ======================

  else if(lastInput === "0"){

   if(session.menu === "matches"){

    return res.send(
     "CON Sportzfx Cricket\n\n"+
     "1 Live\n"+
     "2 Upcoming\n"+
     "3 Recent\n"+
     "4 Unsub\n"+
     "0 Exit"
    );

   }

   return res.send(
    "CON Sportzfx Cricket\n\n"+
    "1 Live\n"+
    "2 Upcoming\n"+
    "3 Recent\n"+
    "4 Unsub\n"+
    "0 Exit"
   );

  }

  res.send(response);

 }
 catch(err){

  console.log("USSD ERROR:", err.message);

  res.send(
   "CON Service error\n\n0 Back"
  );

 }

});


// ======================
// BDApps SUBSCRIPTION CALLBACK
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

  }

  if(status === "UNREGISTERED"){

   await Subscriber.updateOne(
    { msisdn },
    { status:"inactive" }
   );

  }

  res.json({
   statusCode:"S1000",
   statusDetail:"Success"
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
