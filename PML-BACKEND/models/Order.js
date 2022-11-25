const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    orderNo: { type: Number, required: true, unique: true}, //only unique order no,
    details: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
