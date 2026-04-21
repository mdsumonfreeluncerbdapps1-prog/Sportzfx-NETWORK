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

connectDB();


// ======================
// SHOW MATCH MENU
// ======================

function showMatches(session){

 const start = session.page * 5;
 const end = start + 5;

 const list = (session.matches || []).slice(start,end);

 let menu = `CON ${session.title}\n\n`;

 if(list.length === 0){
  return "CON No matches\n\n0 Back";
 }

 list.forEach((m,i)=>{
  menu += `${i+1}. ${parseMatchTitle(m)}\n`;
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

  const session = getSession(sessionId);

  const inputs = text.split("*");
  const lastInput = inputs[inputs.length-1];

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
    "1 Live Matches\n"+
    "2 Upcoming Matches\n"+
    "3 Recent Results\n"+
    "4 Unsubscribe\n"+
    "0 Exit"
   );

  }


  // ======================
  // SUBSCRIBE FLOW
  // ======================

  if(text === "1" && (!user || user.status !== "active")){

   return res.send(
    "CON Cricket Service\n\n"+
    "Daily Charge Tk 2.67\n\n"+
    "1 Confirm\n"+
    "2 Cancel"
   );

  }

  if(text === "1*1" && (!user || user.status !== "active")){

   return res.send("END Subscription request sent");

  }

  if(text === "1*2"){
   return res.send("END Cancelled");
  }


  // ======================
  // BLOCK NON SUBSCRIBER
  // ======================

  if(!user || user.status !== "active"){

   return res.send("END Please subscribe first");
  }


  // ======================
  // MATCH SELECT
  // ======================

  if(session.menu === "matches" && Number(lastInput)>=1 && Number(lastInput)<=5){

   const index = (session.page*5)+(Number(lastInput)-1);

   const match = session.matches[index];

   if(!match){
    return res.send("CON Invalid option\n0 Back");
   }

   let score = "Live score unavailable";

   try{

    const api = await axios.get(
     "https://cricbuzz.autoaiassistant.com/sms.php?message"
    );

    if(api.data){
     score = api.data;
    }

   }catch(err){
    console.log("Score API error:",err.message);
   }

   return res.send(
    "CON "+parseMatchTitle(match)+"\n\n"+
    score+"\n\n"+
    "0 Back"
   );

  }


  // ======================
  // LIVE MATCHES
  // ======================

  if(text === "1" && session.menu !== "matches"){

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
   session.title = "Recent Results";

   response = showMatches(session);

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
    { status:"inactive" }
   );

   return res.send("END You are unsubscribed");

  }


  // ======================
  // BACK
  // ======================

  else if(lastInput === "0"){

   session.menu = null;

   return res.send(
    "CON Sportzfx Cricket\n\n"+
    "1 Live Matches\n"+
    "2 Upcoming Matches\n"+
    "3 Recent Results\n"+
    "4 Unsubscribe\n"+
    "0 Exit"
   );

  }

  res.send(response);

 }
 catch(err){

  console.log("USSD ERROR:",err.message);

  res.send(
   "CON Service error\n\n0 Back"
  );

 }

});


// ======================
// BDAPPS CALLBACK
// ======================

app.post("/subscription", async (req,res)=>{

 try{

  const { subscriberId,status } = req.body;

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
 res.send("Sportzfx Cricket Service Running");
});

const PORT = process.env.PORT || config.server.port || 10000;

app.listen(PORT,()=>{
 console.log("Server running on port",PORT);
});
