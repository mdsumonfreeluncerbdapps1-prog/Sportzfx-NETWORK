const axios = require("axios");

const LIVE = "https://cricbuzz.autoaiassistant.com/sms.php?message=live";
const UPCOMING = "https://cricbuzz.autoaiassistant.com/sms.php?message=upcoming";
const RECENT = "https://cricbuzz.autoaiassistant.com/sms.php?message=recent";

exports.getLive = async () => {
  const res = await axios.get(LIVE);
  return parse(res.data);
};

exports.getUpcoming = async () => {
  const res = await axios.get(UPCOMING);
  return parse(res.data);
};

exports.getRecent = async () => {
  const res = await axios.get(RECENT);
  return parse(res.data);
};

function parse(text) {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line !== "");
}
