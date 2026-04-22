const express = require("express");
const config = require("./config.json");

const connectDB = require("./database/mongodb");
const Subscriber = require("./models/subscriber");

const { fetchMatches } = require("./services/cricketApi");
const { requestOTP, verifyOTP } = require("./services/bdappsApi");

const { getSession } = require("./sessions/ussdSession");

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));

connectDB();

app.get("/",(req,res)=>{
 res.send("Sportzfx BD Robi Airtel Service Active");
});

app.get("/health",(req,res)=>{
 res.json({server:"running"});
});


function mainMenu(){

 return (
  "CON Sportzfx Cricket\n\n"+
  "1 Live Matches\n"+
  "2 Upcoming Matches\n"+
  "3 Subscribe\n"+
  "4 Unsubscribe\n"+
  "0 Exit"
 );

}


async function ussdHandler(req,res){

 res.set("Content-Type","text/plain");

 const sessionId = req.body.sessionId || req.query.sessionId;
 const phone =
  req.body.phoneNumber ||
  req.body.sourceAddress?.replace("tel:","") ||
  "";

 const text = req.body.text || req.body.message || "";

 const session = getSession(sessionId);

 const user = await Subscriber.findOne({msisdn:phone});

 if(text===""){
  return res.send(mainMenu());
 }


 // =================
 // SUBSCRIBE FLOW
 // =================

 if(text==="3"){

  const otp = await requestOTP(phone);

  await Subscriber.updateOne(
   {msisdn:phone},
   {
    msisdn:phone,
    otpReference:otp.referenceNo,
    status:"pending"
   },
   {upsert:true}
  );

  session.otpReference = otp.referenceNo;
  session.otpStep = "verify";

  return res.send(
   "CON OTP sent to your phone\n\n"+
   "Enter OTP:"
  );
 }


 // OTP VERIFY
 if(session.otpStep==="verify"){

  const verify = await verifyOTP(session.otpReference,text);

  if(verify.statusCode==="S1000"){

   await Subscriber.updateOne(
    {msisdn:phone},
    {
     status:"active",
     otpVerified:true
    }
   );

   return res.send("END Subscription Successful");
  }

  return res.send("CON Invalid OTP\nEnter again:");
 }


 // =================
 // MATCH MENU
 // =================

 if(text==="1"){

  const matches = await fetchMatches("live");

  let menu="CON Live Matches\n\n";

  matches.slice(0,5).forEach((m,i)=>{
   menu += `${i+1}. ${m.match_name}\n`;
  });

  menu+="\n0 Back";

  return res.send(menu);

 }


 if(text==="2"){

  const matches = await fetchMatches("upcoming");

  let menu="CON Upcoming Matches\n\n";

  matches.slice(0,5).forEach((m,i)=>{
   menu += `${i+1}. ${m.match_name}\n`;
  });

  menu+="\n0 Back";

  return res.send(menu);

 }


 if(text==="4"){

  await Subscriber.updateOne(
   {msisdn:phone},
   {status:"inactive"}
  );

  return res.send("END Unsubscribed Successfully");
 }


 res.send("END Thank you");

}


app.post("/ussd",ussdHandler);
app.get("/ussd",ussdHandler);


// =================
// SUBSCRIPTION NOTIFY
// =================

app.post("/subscription",(req,res)=>{

 console.log("BDApps subscription notify:",req.body);

 res.json({
  statusCode:"S1000",
  statusDetail:"Success"
 });

});


const PORT=config.port || 10000;

app.listen(PORT,()=>{
 console.log("Sportzfx USSD server running on port",PORT);
});
