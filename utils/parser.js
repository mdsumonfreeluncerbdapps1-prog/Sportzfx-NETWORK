function shortTeam(name){

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

 const t1 = shortTeam(teams[1]);
 const t2 = shortTeam(teams[2]);

 return `${t1} v ${t2}`;

}

module.exports = {
 parseMatchTitle
};
