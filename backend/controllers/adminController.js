const Ride = require("../models/Ride")
const User = require("../models/User")

exports.getAllRides = async (req, res) => {
  try {
    const rides = await Ride.find().populate("user", "name").populate("driver", "name")
    res.json(rides)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
}

exports.assignDriver = async (req, res) => {
  try {
    const { driverId } = req.body
    const ride = await Ride.findById(req.params.rideId)
    if (!ride) {
      return res.status(404).json({ msg: "Ride not found" })
    }
    const driver = await User.findById(driverId)
    if (!driver || driver.role !== "driver") {
      return res.status(400).json({ msg: "Invalid driver" })
    }
    ride.driver = driverId
    ride.status = "accepted"
    await ride.save()
    res.json(ride)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
}

