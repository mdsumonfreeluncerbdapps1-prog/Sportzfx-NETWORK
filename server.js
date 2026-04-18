const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;


// =========================
// API CALL
// =========================

async function getMatches(type){

 try{

  const url = `https://cricbuzz.autoaiassistant.com/sms.php?message=${type}`;

  const res = await axios.get(url,{ timeout:4000 });

  const text = typeof res.data === "string"
   ? res.data
   : "";

  return text;

 }catch(err){

  console.log("API Error:",err.message);

  return "Server maintenance.\nTry later";

 }

}


// =========================
// USSD ENDPOINT
// =========================

app.post("/ussd", async (req,res)=>{

 const text = req.body.text || "";

 let response = "";

 if(text === ""){

  response =
  "CON Sportzfx Cricket\n\n"+
  "1 Live Matches\n"+
  "2 Upcoming Matches\n"+
  "3 Recent Matches";

 }

 else if(text === "1"){

  const data = await getMatches("live");

  response = `CON LIVE MATCHES\n\n${data}\n\n0 Back`;

 }

 else if(text === "2"){

  const data = await getMatches("upcoming");

  response = `CON UPCOMING MATCHES\n\n${data}\n\n0 Back`;

 }

 else if(text === "3"){

  const data = await getMatches("recent");

  response = `CON RECENT MATCHES\n\n${data}\n\n0 Back`;

 }

 else if(text === "0"){

  response =
  "CON Sportzfx Cricket\n\n"+
  "1 Live Matches\n"+
  "2 Upcoming Matches\n"+
  "3 Recent Matches";

 }

 else{

  response = "END Invalid option";

 }

 res.set("Content-Type","text/plain");
 res.send(response);

});


// =========================
// HEALTH CHECK
// =========================

app.get("/",(req,res)=>{

 res.send("Sportzfx Network Running");

});


// =========================
// START SERVER
// =========================

app.listen(PORT,()=>{

 console.log("Server running on",PORT);

});
