const express = require("express");
const router = express.Router();

const controller = require("../controllers/ussdController");

router.post("/", controller.handleUSSD);
router.post("/subscription", controller.handleSubscription);

module.exports = router;
