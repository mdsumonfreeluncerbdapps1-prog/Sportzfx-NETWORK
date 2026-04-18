const axios = require("axios");

const API_BASE = "https://cricbuzz.autoaiassistant.com/api.php?action=";

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
// FETCH MATCHES
// =========================

async function fetchMatches(type){

 try{

  const now = Date.now();

  // return cached data if still valid
  if(cache[type] && (now - lastFetch[type]) < CACHE_TIME){
   return cache[type];
  }

  const url = `${API_BASE}${type}&type=all`;

  const res = await axios.get(url,{
   timeout:3000
  });

  const data = Array.isArray(res.data) ? res.data : [];

  // save to cache
  cache[type] = data;
  lastFetch[type] = now;

  return data;

 }catch(err){

  console.log("Cricket API Error:",err.message);

  // fallback to old cache if available
  if(cache[type]){
   return cache[type];
  }

  return [];

 }

}

module.exports = {
 fetchMatches
};
