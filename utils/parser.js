function parseMatchTitle(match){

 const name = match.match_name || "";

 // detect match type
 const matchType =
 name.match(/\d+(st|nd|rd|th)\s(Test|ODI|T20I)/i);

 let type = matchType ? matchType[0] : "";

 // detect teams
 const teams =
 name.match(/([A-Za-z]{2,})\s+vs\s+([A-Za-z]{2,})/i);

 if(teams){

  const team1 = teams[1].toUpperCase();
  const team2 = teams[2].toUpperCase();

  if(type){
   return `${type} ${team1} vs ${team2}`;
  }

  return `${team1} vs ${team2}`;
 }

 if(type){
  return type;
 }

 return "Match";

}

module.exports = {
 parseMatchTitle
};
