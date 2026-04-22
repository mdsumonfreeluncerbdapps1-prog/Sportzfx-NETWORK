const express = require("express");
const config = require("./config.json");

const connectDB = require("./database/mongodb");
const Subscriber = require("./models/subscriber");

const { fetchMatches } = require("./services/cricketApi");
const { parseMatchTitle } = require("./utils/parser");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();


// ======================
// ROOT CHECK
// ======================

app.get("/", (req, res) => {
 res.send("Sportzfx BD Robi Airtel Service Active 🇧🇩✅✅");
});


// ======================
// HEALTH CHECK
// ======================

app.get("/health", (req,res)=>{
 res.json({
  server:"running",
  uptime:Math.floor(process.uptime()),
  cache:"active"
 });
});


// ======================
// SESSION STORE
// ======================

let sessions = {};
const SESSION_TTL = 5 * 60 * 1000;
const MAX_SESSIONS = 5000;

function getSession(sessionId){

 if(!sessionId){
  sessionId = "temp-"+Date.now();
 }

 if(Object.keys(sessions).length > MAX_SESSIONS){
  sessions = {};
 }

 if(!sessions[sessionId]){
  sessions[sessionId] = {
   page:0,
   matches:[],
   menu:null,
   selectedMatch:null,
   lastAccess:Date.now()
  };
 }

 sessions[sessionId].lastAccess = Date.now();
 return sessions[sessionId];
}


// ======================
// AUTO CLEAN SESSION
// ======================

setInterval(()=>{

 const now = Date.now();

 Object.keys(sessions).forEach(id=>{
  if(now - sessions[id].lastAccess > SESSION_TTL){
   delete sessions[id];
  }
 });

},60000);


// ======================
// API CACHE
// ======================

const matchCache = {
 live:{data:[],time:0},
 upcoming:{data:[],time:0},
 recent:{data:[],time:0}
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

  const apiPromise = fetchMatches(type);

  const timeout = new Promise((_,reject)=>
   setTimeout(()=>reject(new Error("API timeout")),3000)
  );

  const matches = await Promise.race([apiPromise,timeout]);

  if(!matches || !Array.isArray(matches)){
   return [];
  }

  matchCache[type] = {
   data:matches,
   time:now
  };

  return matches;

 }catch(err){

  console.log("Match API error:",err.message);
  return [];
 }

}


// ======================
// MATCH LIST
// ======================

function showMatches(session){

 const matches = session.matches || [];

 if(matches.length === 0){
  return "CON Live score unavailable now\nPlease try again later\n\n0 Back";
 }

 const start = session.page * 5;
 const end = start + 5;

 const list = matches.slice(start,end);

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
// USSD HANDLER
// ======================

async function ussdHandler(req,res){

 const startTime = Date.now();

 try{

  res.set("Content-Type","text/plain");

  console.log("USSD REQUEST:", req.body || req.query);

  const sessionId = req.body.sessionId || req.query.sessionId;
  const phone = req.body.phoneNumber || req.body.msisdn || req.query.phoneNumber || "";
  const text = req.body.text || req.query.text || "";

  const session = getSession(sessionId);

  const inputs = text.split("*");
  const lastInput = inputs[inputs.length-1];

  const user = await Subscriber.findOne({msisdn:phone}).lean();

  let response="";


  if(text===""){

   if(!user || user.status!=="active"){

    return res.send(
     "CON Welcome to Sportzfx Cricket\n\n"+
     "Get live cricket scores and updates\n\n"+
     "5 Subscribe\n"+
     "0 Exit"
    );

   }

   return res.send(mainMenu());

  }


  if(text==="0"){
   return res.send("END Thank you for using Sportzfx Cricket");
  }


  if(text==="5" && (!user || user.status!=="active")){

   return res.send(
    "CON Confirm Subscription\n\n"+
    "Sportzfx Cricket Service\n"+
    "Daily charge Tk 2.67\n\n"+
    "1 Confirm\n"+
    "2 Cancel\n"+
    "0 Back"
   );

  }


  if(text==="5*1"){
   return res.send("END Subscription request sent\nConfirmation SMS will follow");
  }

  if(text==="5*2"){
   return res.send("END Subscription cancelled");
  }


  if(!user || user.status!=="active"){
   return res.send("END Please subscribe first\n\nDial *213*15755#");
  }


  if(lastInput==="0" && session.menu==="matches"){

   session.page=0;
   session.matches=[];
   session.menu=null;
   session.selectedMatch=null;

   return res.send(mainMenu());

  }


  if(text==="1"){

   session.matches = await getMatchesSafe("live");

   session.page=0;
   session.menu="matches";
   session.title="Live Matches";

   response=showMatches(session);

  }

  else if(text==="2"){

   session.matches = await getMatchesSafe("upcoming");

   session.page=0;
   session.menu="matches";
   session.title="Upcoming Matches";

   response=showMatches(session);

  }

  else if(text==="3"){

   session.matches = await getMatchesSafe("recent");

   session.page=0;
   session.menu="matches";
   session.title="Recent Matches";

   response=showMatches(session);

  }


  else if(session.menu==="matches" && Number(lastInput)>=1 && Number(lastInput)<=5){

   session.selectedMatch=(session.page*5)+(Number(lastInput)-1);

   const match=session.matches[session.selectedMatch];

   if(!match){
    return res.send("CON Invalid selection\n\n0 Back");
   }

   const title=parseMatchTitle(match).substring(0,30);

   return res.send(
    "CON "+title+
    "\n\n"+(match.team1Score||"")+
    "\n"+(match.team2Score||"")+
    "\n\n"+(match.status||"Score updating")+
    "\n\n1 Refresh\n0 Back"
   );

  }


  else if(lastInput==="1"){

   if(session.selectedMatch===null){
    return res.send("CON Session expired\n\n0 Back");
   }

   const matches=await getMatchesSafe("live");
   const match=matches[session.selectedMatch];

   if(!match){
    return res.send("CON Score unavailable\n\n0 Back");
   }

   const title=parseMatchTitle(match).substring(0,30);

   return res.send(
    "CON "+title+
    "\n\n"+(match.team1Score||"")+
    "\n"+(match.team2Score||"")+
    "\n\n"+(match.status||"Score updating")+
    "\n\n1 Refresh\n0 Back"
   );

  }


  else if(lastInput==="9" && session.menu==="matches"){

   if((session.page+1)*5 < session.matches.length){
    session.page++;
   }

   response=showMatches(session);

  }


  else if(lastInput==="4"){

   await Subscriber.updateOne(
    {msisdn:phone},
    {status:"inactive"}
   );

   return res.send("END You have successfully unsubscribed");

  }


  if(!response){
   response="CON Invalid selection\n\n0 Back";
  }

  res.send(response);

  console.log("USSD response time:",Date.now()-startTime,"ms");

 }catch(err){

  console.log("USSD ERROR:",err.message);

  res.send(
   "CON Service temporarily unavailable\n"+
   "Please try again later\n\n"+
   "0 Back"
  );

 }

}


// ======================
// USSD ROUTES
// ======================

app.post("/ussd", ussdHandler);
app.get("/ussd", ussdHandler);


// ======================
// SERVER START
// ======================

const PORT=config.port||10000;

app.listen(PORT,()=>{
 console.log("Sportzfx USSD server running on port",PORT);
});
