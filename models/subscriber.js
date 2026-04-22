const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema({

 msisdn:{
  type:String,
  unique:true,
  required:true
 },

 status:{
  type:String,
  default:"pending"
 },

 otpReference:{
  type:String,
  default:null
 },

 otpVerified:{
  type:Boolean,
  default:false
 },

 subscribeDate:{
  type:Date,
  default:Date.now
 }

});

module.exports = mongoose.model("Subscriber", subscriberSchema);
