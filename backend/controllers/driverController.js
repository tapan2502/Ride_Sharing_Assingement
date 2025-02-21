const User = require("../models/User")

exports.getAvailableDrivers = async (req, res) => {
  try {
    const availableDrivers = await User.find({ role: "driver", isAvailable: true })
      .select("name rating vehicleDetails")
      .lean()

    console.log("Available drivers found:", availableDrivers.length)

    if (availableDrivers.length === 0) {
      return res.status(404).json({ msg: "No available drivers found" })
    }

    res.json(availableDrivers)
  } catch (err) {
    console.error("Error fetching available drivers:", err.message)
    res.status(500).send("Server error while fetching available drivers")
  }
}

exports.updateDriverAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body
    const driverId = req.user.id

    if (req.user.role !== "driver") {
      return res.status(403).json({ msg: "Only drivers can update their availability" })
    }

    const updatedDriver = await User.findByIdAndUpdate(driverId, { isAvailable }, { new: true, runValidators: true })

    if (!updatedDriver) {
      return res.status(404).json({ msg: "Driver not found" })
    }

    console.log(`Driver ${driverId} availability updated to ${isAvailable}`)

    res.json({ msg: "Driver availability updated successfully", driver: updatedDriver })
  } catch (err) {
    console.error("Error updating driver availability:", err.message)
    res.status(500).send("Server error while updating driver availability")
  }
}

