const axios = require("axios");

// NEW SMS API
const API_BASE = "https://cricbuzz.autoaiassistant.com/sms.php?message=";

// =========================
// CACHE STORAGE
// =========================

let cache = {
 live: null,
 upcoming: null,
 recent: null
};

let lastFetch = {
 live: 0,
 upcoming: 0,
 recent: 0
};

// cache duration (30 seconds)
const CACHE_TIME = 30000;


// =========================
// PARSE TEXT RESPONSE
// =========================

function parseMatches(text){

 if(!text) return [];

 const lines = text.split("\n");

 let matches = [];

 lines.forEach(line => {

  line = line.trim();

  if(!line) return;

  // remove numbering like "1. "
  line = line.replace(/^\d+\.\s*/, "");

  if(line.includes("vs")){

   matches.push({
    match_name: line,
    score: [],
    result: ""
   });

  }

 });

 return matches;

}


// =========================
// FETCH MATCHES
// =========================

async function fetchMatches(type){

 try{

  const now = Date.now();

  // return cached data
  if(cache[type] && (now - lastFetch[type]) < CACHE_TIME){
   return cache[type];
  }

  const url = `${API_BASE}${type}`;

  const res = await axios.get(url,{
   timeout:3000
  });

  const text = res.data || "";

  const matches = parseMatches(text);

  // save cache
  cache[type] = matches;
  lastFetch[type] = now;

  return matches;

 }catch(err){

  console.log("Cricket API Error:",err.message);

  // fallback to cache
  if(cache[type]){
   return cache[type];
  }

  return [];

 }

}

module.exports = {
 fetchMatches
};
