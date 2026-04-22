const axios = require("axios");
const config = require("../config.json");

const BASE = "https://developer.bdapps.com";

async function requestOTP(msisdn){

 const payload = {
  applicationId: config.bdappsAppId,
  password: config.bdappsPassword,
  subscriberId: `tel:${msisdn}`,
  applicationHash: "sportzfx"
 };

 const res = await axios.post(`${BASE}/otp/request`,payload,{
  headers:{ "Content-Type":"application/json"}
 });

 return res.data;
}

async function verifyOTP(referenceNo,otp){

 const payload = {
  applicationId: config.bdappsAppId,
  password: config.bdappsPassword,
  referenceNo,
  otp
 };

 const res = await axios.post(`${BASE}/otp/verify`,payload,{
  headers:{ "Content-Type":"application/json"}
 });

 return res.data;
}

module.exports = {
 requestOTP,
 verifyOTP
};
