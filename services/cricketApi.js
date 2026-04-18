const axios = require("axios");

const API_BASE = "https://cricbuzz.autoaiassistant.com/sms.php?message=";

const cache = {};
const lastFetch = {};

const CACHE_TIME = 30000;


// =========================
// PARSE API TEXT
// =========================

function parseMatches(text){

 if(!text || typeof text !== "string"){
  return [];
 }

 const lines = text.split("\n");

 const matches = [];

 for(const line of lines){

  const clean = line.trim();

  if(clean && clean.includes("vs")){
   matches.push({
    match_name: clean,
    score: [],
    result: ""
   });
  }

 }

 return matches;

}


// =========================
// FETCH MATCHES
// =========================

async function fetchMatches(type){

 try{

  if(!type){
   return [];
  }

  const now = Date.now();

  if(cache[type] && now - lastFetch[type] < CACHE_TIME){
   return cache[type];
  }

  const url = `${API_BASE}${type}`;

  const res = await axios.get(url,{
   timeout:4000
  });

  const text = typeof res.data === "string"
   ? res.data
   : JSON.stringify(res.data);

  const matches = parseMatches(text);

  cache[type] = matches;
  lastFetch[type] = now;

  return matches;

 }catch(err){

  console.log("Cricket API Error:",err.message);

  return cache[type] || [];

 }

}

module.exports = {
 fetchMatches
};
