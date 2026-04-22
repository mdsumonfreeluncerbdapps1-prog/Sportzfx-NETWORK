const express = require("express");
const router = express.Router();
const controller = require("../controllers/ussdController");

// health check
router.get("/", (req, res) => {
  res.send("USSD Server Running");
});

// main ussd
router.post("/ussd/receive", controller.handleUSSD);

module.exports = router;
