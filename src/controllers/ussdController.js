const bdapps = require("../services/bdappsService");

exports.handleUSSD = async (req, res) => {
  try {
    const { sessionId, ussdOperation, sourceAddress } = req.body;

    console.log("Incoming Request:", req.body);

    let reply = "";
    let operation = "mt-cont";

    // First dial (*123#)
    if (ussdOperation === "mo-init") {
      reply = "Cricket Menu\n1. Live\n2. Upcoming\n3. Recent\n0. Exit";
    }

    // Send response to BDApps
    await bdapps.send({
      sessionId: sessionId,
      message: reply,
      operation: operation,
      destinationAddress: sourceAddress
    });

    console.log("Reply Sent:", reply);

    res.sendStatus(200);

  } catch (error) {
    console.error("USSD Error:", error);

    res.sendStatus(500);
  }
};
