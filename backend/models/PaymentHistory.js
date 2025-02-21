const mongoose = require("mongoose")

const paymentHistorySchema = new mongoose.Schema({
  ride: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["cash", "card"], required: true },
  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model("PaymentHistory", paymentHistorySchema)

