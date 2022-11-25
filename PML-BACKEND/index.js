const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const orderRoute = require("./routes/order");
const cors = require("cors");
dotenv.config();

mongoose
  .connect(process.env.MONGO_URL) //Im using local mongo database => mongodb://localhost:27017/PML
  .then(() => console.log("DBconnection Successful"))
  .catch((err) => {
    console.log(err);
  });

app.use(cors());
app.use(express.json());
app.use("/api/order", orderRoute);

const server = app.listen(process.env.PORT || 5000, () => {
  console.log("Backend Server is running");
});
