const cricket = require("../services/cricketService");
const bdapps = require("../services/bdappsService");
const session = require("../utils/sessionManager");
const formatter = require("../utils/formatter");

exports.handleUSSD = async (req, res) => {
  try {
    const { message, sessionId, ussdOperation, sourceAddress } = req.body;

    let user = session.get(sessionId);
    let reply = "";
    let operation = "mt-cont";

    // =========================
    // FIRST MENU
    // =========================
    if (ussdOperation === "mo-init") {
      session.set(sessionId, { state: "MAIN", page: 0 });

      reply = "Sportzfx BD\n1. Live Matches\n2. Upcoming Matches\n3. Recent Matches\n0. Exit";
    }

    // =========================
    // USER INPUT
    // =========================
    else if (ussdOperation === "mo-cont") {

      // MAIN MENU
      if (user.state === "MAIN") {

        if (message === "1") {
          const data = await cricket.getLive();

          session.set(sessionId, {
            state: "LIVE",
            data,
            page: 0
          });

          reply = formatter.formatMatches(data, 0);
        }

        else if (message === "2") {
          const data = await cricket.getUpcoming();

          session.set(sessionId, {
            state: "UPCOMING",
            data,
            page: 0
          });

          reply = formatter.formatMatches(data, 0);
        }

        else if (message === "3") {
          const data = await cricket.getRecent();

          session.set(sessionId, {
            state: "RECENT",
            data,
            page: 0
          });

          reply = formatter.formatMatches(data, 0);
        }

        else if (message === "0") {
          reply = "Thank you!";
          operation = "mt-fin";
          session.clear(sessionId);
        }

        else {
          reply = "Invalid option";
        }
      }

      // =========================
      // PAGINATION + BACK
      // =========================
      else {

        // NEXT PAGE
        if (message === "9") {
          user.page++;

          session.set(sessionId, user);

          reply = formatter.formatMatches(user.data, user.page);
        }

        // BACK TO MAIN MENU
        else if (message === "0") {
          session.set(sessionId, { state: "MAIN", page: 0 });

          reply = "Sportzfx BD\n1. Live Matches\n2. Upcoming Matches\n3. Recent Matches\n0. Exit";
        }

        else {
          reply = "Press 9 for Next\n0 for Back";
        }
      }
    }

    // =========================
    // SEND RESPONSE
    // =========================
    await bdapps.send({
      sessionId,
      message: reply,
      operation,
      destinationAddress: sourceAddress
    });

    res.sendStatus(200);

  } catch (error) {
    console.error("USSD Error:", error);

    res.sendStatus(500);
  }
};
