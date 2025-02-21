const mongoose = require("mongoose")

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "driver", "admin"], default: "user" },
    phone: { type: String, required: true },
    licenseNumber: {
      type: String,
      required: function () {
        return this.role === "driver"
      },
    },
    vehicleDetails: {
      make: String,
      model: String,
      year: Number,
      plateNumber: String,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    rating: { type: Number, default: 0 },
  },
  { timestamps: true },
)

module.exports = mongoose.model("User", userSchema)

