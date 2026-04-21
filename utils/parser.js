function parseMatchTitle(match){

 const name = match.match_name || "";

 const teams = name.match(/([A-Za-z ]+)\s+vs\s+([A-Za-z ]+)/i);

 if(teams){

  const team1 = teams[1].trim().substring(0,3).toUpperCase();
  const team2 = teams[2].trim().substring(0,3).toUpperCase();

  return `${team1} v ${team2}`;
 }

 return "Match";

}

module.exports = {
 parseMatchTitle
};
