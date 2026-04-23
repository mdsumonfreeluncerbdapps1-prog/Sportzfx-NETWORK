const cricket = require("../services/cricketService");
const bdapps = require("../services/bdappsService");
const session = require("../utils/sessionManager");

exports.handleUSSD = async (req, res) => {
  try {
    const { sessionId, message, ussdOperation, sourceAddress } = req.body;

    let user = session.get(sessionId) || {};
    let reply = "";
    let operation = "mt-cont";

    // FIRST MENU
    if (ussdOperation === "mo-init") {
      session.set(sessionId, { state: "MAIN", page: 0 });

      reply = "SportzFX BD\n1. Live\n2. Upcoming\n3. Recent\n0. Exit";
    }

    else if (ussdOperation === "mo-cont") {

      if (user.state === "MAIN") {

        if (message === "1") {
          const data = await cricket.getLive();
          session.set(sessionId, { state: "LIVE", data, page: 0 });
          reply = data.slice(0, 3).join("\n") + "\n9.Next\n0.Back";
        }

        else if (message === "2") {
          const data = await cricket.getUpcoming();
          session.set(sessionId, { state: "UPCOMING", data, page: 0 });
          reply = data.slice(0, 3).join("\n") + "\n9.Next\n0.Back";
        }

        else if (message === "3") {
          const data = await cricket.getRecent();
          session.set(sessionId, { state: "RECENT", data, page: 0 });
          reply = data.slice(0, 3).join("\n") + "\n9.Next\n0.Back";
        }

        else if (message === "0") {
          reply = "Thank you";
          operation = "mt-fin";
          session.clear(sessionId);
        }

        else {
          reply = "Invalid option";
        }
      }

      else {
        if (message === "9") {
          user.page++;
          session.set(sessionId, user);
          reply = user.data.slice(user.page * 3, user.page * 3 + 3).join("\n") + "\n9.Next\n0.Back";
        }

        else if (message === "0") {
          session.set(sessionId, { state: "MAIN", page: 0 });
          reply = "SportzFX BD\n1. Live\n2. Upcoming\n3. Recent\n0. Exit";
        }
      }
    }

    await bdapps.send({
      sessionId,
      message: reply,
      operation,
      destinationAddress: sourceAddress
    });

    res.sendStatus(200);

  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};

// SUBSCRIPTION
exports.handleSubscription = async (req, res) => {
  console.log("Subscription:", req.body);
  res.sendStatus(200);
};
