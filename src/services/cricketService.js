const axios = require("axios");

exports.getLive = async () => {
  const res = await axios.get(process.env.LIVE_API);
  return res.data.split("\n");
};

exports.getUpcoming = async () => {
  const res = await axios.get(process.env.UPCOMING_API);
  return res.data.split("\n");
};

exports.getRecent = async () => {
  const res = await axios.get(process.env.RECENT_API);
  return res.data.split("\n");
};
