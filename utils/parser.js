function shortTeam(name){

 if(!name) return "TBD";

 return name
  .trim()
  .split(" ")
  .map(w => w[0])
  .join("")
  .substring(0,3)
  .toUpperCase();

}

function parseMatchTitle(match){

 const title = match.match_name || "";

 const teams = title.match(/(.+?)\s+vs\s+(.+)/i);

 if(!teams){
  return "Match";
 }

 const team1 = shortTeam(teams[1]);
 const team2 = shortTeam(teams[2]);

 return `${team1} v ${team2}`;

}

module.exports = {
 parseMatchTitle
};
