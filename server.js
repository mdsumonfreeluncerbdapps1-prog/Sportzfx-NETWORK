require("dotenv").config();
const express = require("express");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ussdRoutes = require("./src/routes/ussdRoutes");

app.use("/ussd", ussdRoutes);
app.use("/subscription", ussdRoutes);

app.get("/", (req, res) => {
  res.send("🚀 BDApps USSD Server Running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
