const mongose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
        await mongose.connect(process.env.MONGODB_URI)
        console.log("MongoDB connected");
  } catch (err) {
    console.log("MongoDB connection error :");
    console.error(err.message)
    process.exit(1);
  }
};


module.exports = connectDB;