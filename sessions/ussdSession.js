let sessions = {};

const SESSION_TIMEOUT = 5 * 60 * 1000;

function getSession(sessionId){

 if(!sessions[sessionId]){

  sessions[sessionId] = {
   menu:"main",
   page:0,
   otpStep:null,
   otpReference:null,
   createdAt:Date.now()
  };

 }

 sessions[sessionId].createdAt = Date.now();

 return sessions[sessionId];
}

setInterval(()=>{

 const now = Date.now();

 for(const id in sessions){

  if(now - sessions[id].createdAt > SESSION_TIMEOUT){
   delete sessions[id];
  }

 }

},60000);

module.exports = {
 getSession
};
