const mongoose = require("mongoose")

const rideSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Made optional since it's not assigned at booking
  pickup: {
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  dropoff: {
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
  },
  status: {
    type: String,
    enum: ["requested", "accepted", "in-progress", "completed", "cancelled"],
    default: "requested", // Changed default to requested
  },
  fare: { type: Number, required: true },
  distance: { type: Number, required: true },
  duration: { type: Number, required: true }, // Estimated duration in minutes
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "card"],
    required: true,
  },
})

module.exports = mongoose.model("Ride", rideSchema)

