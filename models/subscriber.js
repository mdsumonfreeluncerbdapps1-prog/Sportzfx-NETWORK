const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema({

 msisdn:{
  type:String,
  unique:true
 },

 status:{
  type:String,
  default:"active"
 },

 subscribeDate:{
  type:Date,
  default:Date.now
 }

});

module.exports = mongoose.model("Subscriber", subscriberSchema);
