function parseMatchTitle(match){

 const name = match.match_name || "";

 // detect teams
 const teams =
 name.match(/([A-Za-z]{2,})\s+vs\s+([A-Za-z]{2,})/i);

 if(teams){

  const team1 = teams[1].substring(0,3).toUpperCase();
  const team2 = teams[2].substring(0,3).toUpperCase();

  return `${team1} v ${team2}`;
 }

 // fallback
 if(match.team1 && match.team2){

  const team1 = match.team1.substring(0,3).toUpperCase();
  const team2 = match.team2.substring(0,3).toUpperCase();

  return `${team1} v ${team2}`;
 }

 return "Match";

}

module.exports = {
 parseMatchTitle
};
