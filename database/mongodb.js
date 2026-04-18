const mongoose = require("mongoose");

const MONGO_URI = "mongodb+srv://mdsumonfreeluncerbdapps1_db_user:K3iTPSRImgo4aDsB@cluster0.zjv6x03.mongodb.net/sportzfx?retryWrites=true&w=majority";

async function connectDB() {

 try {

  await mongoose.connect(MONGO_URI, {
   useNewUrlParser: true,
   useUnifiedTopology: true
  });

  console.log("MongoDB Connected");

 } catch (err) {

  console.error("MongoDB Connection Error:", err.message);

 }

}

// prevent mongoose crash
mongoose.connection.on("error", err => {
 console.error("MongoDB Runtime Error:", err);
});

module.exports = connectDB;
