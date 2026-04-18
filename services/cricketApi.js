const axios = require("axios");

const API_BASE = "https://cricbuzz.autoaiassistant.com/sms.php?message=";

// =========================
// CACHE
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
// PARSE API TEXT
// =========================

function parseMatches(text){

 try{

  if(!text || typeof text !== "string"){
   return [];
  }

  const lines = text.split("\n");

  const matches = [];

  for(const line of lines){

   const clean = line.trim();

   if(!clean) continue;

   if(clean.includes("vs")){

    matches.push({
     match_name: clean,
     score: [],
     result: ""
    });

   }

  }

  return matches;

 }catch(err){

  console.log("Parse error:",err.message);
  return [];

 }

}


// =========================
// FETCH MATCHES
// =========================

async function fetchMatches(type){

 try{

  const now = Date.now();

  if(cache[type] && now - lastFetch[type] < CACHE_TIME){
   return cache[type];
  }

  const url = `${API_BASE}${type}`;

  const res = await axios.get(url,{ timeout:4000 });

  const text = res.data;

  const matches = parseMatches(text);

  cache[type] = matches;
  lastFetch[type] = now;

  return matches;

 }catch(err){

  console.log("Cricket API Error:",err.message);

  if(cache[type]){
   return cache[type];
  }

  return [];

 }

}

module.exports = {
 fetchMatches
};
