const axios = require("axios");

const API_BASE = "https://cricbuzz.autoaiassistant.com/sms.php?message=";

// =========================
// CACHE STORAGE
// =========================

let cache = {
 live: [],
 upcoming: [],
 recent: []
};

let lastFetch = {
 live: 0,
 upcoming: 0,
 recent: 0
};

const CACHE_TIME = 30000;


// =========================
// PARSE TEXT RESPONSE
// =========================

function parseMatches(text){

 if(!text || typeof text !== "string"){
  return [];
 }

 const lines = text.split("\n");

 const matches = [];

 for(let line of lines){

  line = line.trim();

  if(!line) continue;

  line = line.replace(/^\d+\.\s*/, "");

  if(line.includes("vs")){
   matches.push({
    match_name: line,
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

  const now = Date.now();

  if(cache[type] && (now - lastFetch[type]) < CACHE_TIME){
   return cache[type];
  }

  const url = `${API_BASE}${type}`;

  const res = await axios.get(url,{ timeout:4000 });

  const text =
   typeof res.data === "string"
    ? res.data
    : "";

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
