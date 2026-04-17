function parseMatchTitle(match){

 const name = match.match_name || "";

 const matchType =
 name.match(/\d+(st|nd|rd|th)\s(Test|ODI|T20I)/i);

 const type = matchType ? matchType[0] : "Match";

 const teams =
 name.match(/([A-Z]{2,4})\svs\s([A-Z]{2,4})/i);

 if(teams){

  return `${type} ${teams[1]} vs ${teams[2]}`;

 }

 return type;

}

module.exports = {
 parseMatchTitle
};
