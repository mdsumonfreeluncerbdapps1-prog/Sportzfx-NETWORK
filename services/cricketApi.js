const axios = require("axios");

const API_BASE =
"https://cricbuzz.autoaiassistant.com/api.php?action=";

async function fetchMatches(type){

 try{

  const url = `${API_BASE}${type}&type=all`;

  const res = await axios.get(url, {
   timeout: 10000
  });

  if(!res.data){
   return [];
  }

  return res.data;

 }catch(err){

  console.log("Cricket API Error:", err.message);

  return [];

 }

}

module.exports = {
 fetchMatches
};
