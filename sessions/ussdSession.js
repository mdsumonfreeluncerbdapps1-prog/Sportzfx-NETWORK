let sessions = {};

function getSession(sessionId){

 if(!sessions[sessionId]){

  sessions[sessionId] = {
   menu:"main",
   page:0
  };

 }

 return sessions[sessionId];

}

module.exports = {
 getSession
};
