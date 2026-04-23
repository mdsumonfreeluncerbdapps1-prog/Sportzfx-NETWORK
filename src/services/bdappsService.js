const axios = require("axios");

exports.send = async (payload) => {
  try {
    await axios.post(process.env.BDAPPS_URL, payload, {
      auth: {
        username: process.env.APP_ID,
        password: process.env.APP_PASSWORD
      }
    });
  } catch (err) {
    console.error("BDApps error:", err.message);
  }
};
