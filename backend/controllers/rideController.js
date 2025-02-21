const Ride = require("../models/Ride")
const User = require("../models/User")
const io = require("../utils/socketManager")()
const fetch = require("node-fetch")
const turf = require("@turf/turf")

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search"

async function getCoordinates(address) {
  const response = await fetch(`${NOMINATIM_BASE_URL}?format=json&q=${encodeURIComponent(address)}`)
  const data = await response.json()
  if (data.length === 0) throw new Error("Address not found")
  return { lat: Number.parseFloat(data[0].lat), lon: Number.parseFloat(data[0].lon) }
}

async function calculateRouteDetails(pickup, dropoff) {
  const from = await getCoordinates(pickup)
  const to = await getCoordinates(dropoff)

  // Calculate distance using turf
  const fromPoint = turf.point([from.lon, from.lat])
  const toPoint = turf.point([to.lon, to.lat])
  const distance = turf.distance(fromPoint, toPoint, { units: "kilometers" })

  // Estimate duration (assuming average speed of 40 km/h)
  const duration = (distance / 40) * 60 // in minutes

  // Estimate fare (example: base fare of $5 + $2 per km)
  const fare = 5 + distance * 2

  return {
    distance: Number.parseFloat(distance.toFixed(2)),
    duration: Math.round(duration),
    fare: Number.parseFloat(fare.toFixed(2)),
    pickupCoordinates: from,
    dropoffCoordinates: to,
  }
}

exports.bookRide = async (req, res) => {
  try {
    const { pickup, dropoff, paymentMethod, driverId } = req.body
    const userId = req.user.id

    console.log("Received ride booking request:", { pickup, dropoff, paymentMethod, userId, driverId })

    if (!pickup || !dropoff || !paymentMethod) {
      console.log("Missing required fields:", { pickup, dropoff, paymentMethod })
      return res.status(400).json({ msg: "Missing required fields" })
    }

    const routeDetails = await calculateRouteDetails(pickup, dropoff)

    const newRide = new Ride({
      user: userId,
      driver: driverId, // Add this line
      pickup: {
        address: pickup,
        lat: routeDetails.pickupCoordinates.lat,
        lng: routeDetails.pickupCoordinates.lon,
      },
      dropoff: {
        address: dropoff,
        lat: routeDetails.dropoffCoordinates.lat,
        lng: routeDetails.dropoffCoordinates.lon,
      },
      status: "requested", // Set initial status to "requested"
      paymentMethod,
      distance: routeDetails.distance,
      duration: routeDetails.duration,
      fare: routeDetails.fare,
    })

    if (driverId) {
      newRide.driver = driverId
      newRide.status = "accepted"
    }

    const ride = await newRide.save()
    console.log("Ride saved successfully:", ride)

    if (driverId) {
      await User.findByIdAndUpdate(driverId, { isAvailable: false })
    }

    // Notify available drivers about the new ride request
    if (!driverId) {
      const availableDrivers = await User.find({ role: "driver", isAvailable: true })
      availableDrivers.forEach((driver) => {
        io.to(driver._id.toString()).emit("newRideRequest", ride)
      })
    } else {
      io.to(driverId).emit("rideAssigned", ride)
    }

    res.status(201).json(ride)
  } catch (err) {
    console.error("Error booking ride:", err)
    res.status(500).json({ msg: "Server error during ride booking", error: err.message })
  }
}

exports.acceptRide = async (req, res) => {
  try {
    const rideId = req.params.id
    const driverId = req.user.id

    const ride = await Ride.findOne({
      _id: rideId,
      status: "requested",
    })

    if (!ride) {
      return res.status(404).json({ msg: "Ride not available for acceptance" })
    }

    // Check if driver is available
    const driver = await User.findOne({ _id: driverId, isAvailable: true })
    if (!driver) {
      return res.status(400).json({ msg: "Driver is not available to accept rides" })
    }

    // Update ride with driver and change status
    ride.driver = driverId
    ride.status = "accepted"
    await ride.save()

    // Update driver availability
    driver.isAvailable = false
    await driver.save()

    // Notify the user that their ride was accepted
    io.to(ride.user.toString()).emit("rideAccepted", {
      ride,
      driver: {
        name: driver.name,
        phone: driver.phone,
        vehicleDetails: driver.vehicleDetails,
      },
    })

    res.json(ride)
  } catch (err) {
    console.error("Error accepting ride:", err.message)
    res.status(500).send("Server error while accepting ride")
  }
}

exports.cancelRide = async (req, res) => {
  try {
    const rideId = req.params.id
    const userId = req.user.id

    const ride = await Ride.findOne({
      _id: rideId,
      user: userId,
      status: { $in: ["requested", "accepted"] },
    })

    if (!ride) {
      return res.status(404).json({ msg: "No active ride found to cancel" })
    }

    ride.status = "cancelled"
    await ride.save()

    // If a driver was assigned, update their availability
    if (ride.driver) {
      await User.findByIdAndUpdate(ride.driver, { isAvailable: true })
      io.to(ride.driver.toString()).emit("rideCancelled", ride)
    }

    res.json({ msg: "Ride cancelled successfully" })
  } catch (err) {
    console.error("Error cancelling ride:", err.message)
    res.status(500).send("Server error while cancelling ride")
  }
}

exports.getCurrentRide = async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role

    const query =
      userRole === "driver"
        ? { driver: userId, status: { $in: ["accepted", "in-progress"] } }
        : { user: userId, status: { $in: ["requested", "accepted", "in-progress"] } }

    const ride = await Ride.findOne(query)
      .populate("user", "name phone")
      .populate("driver", "name phone vehicleDetails")

    if (!ride) {
      return res.status(404).json({ msg: "No active ride found" })
    }

    // Calculate ETA and other real-time details
    const rideDetails = {
      ...ride.toObject(),
      eta: ride.status === "accepted" ? new Date(Date.now() + ride.duration * 60000).toISOString() : null,
      remainingDistance: ride.distance, // This should be updated based on driver's location
      remainingDuration: ride.duration, // This should be updated based on traffic conditions
    }

    res.json(rideDetails)
  } catch (err) {
    console.error("Error fetching current ride:", err.message)
    res.status(500).json({ msg: "Server error while fetching current ride" })
  }
}

exports.getAllRides = async (req, res) => {
  try {
    const rides = await Ride.find().populate("user", "name").populate("driver", "name").sort({ createdAt: -1 })
    res.json(rides)
  } catch (err) {
    console.error("Error fetching rides:", err.message)
    res.status(500).send("Server error while fetching rides")
  }
}

exports.getAvailableRides = async (req, res) => {
  try {
    const availableRides = await Ride.find({ status: "requested" }).populate("user", "name").sort({ createdAt: -1 })
    res.json(availableRides)
  } catch (err) {
    console.error("Error fetching available rides:", err.message)
    res.status(500).send("Server error while fetching available rides")
  }
}

exports.getCurrentRideForDriver = async (req, res) => {
  try {
    const driverId = req.user.id
    const ride = await Ride.findOne({
      $or: [{ driver: driverId, status: { $in: ["accepted", "in-progress"] } }, { status: "requested" }],
    }).populate("user", "name phone")

    if (!ride) {
      return res.status(404).json({ msg: "No active ride found for the driver" })
    }

    res.json(ride)
  } catch (err) {
    console.error("Error fetching current ride for driver:", err.message)
    res.status(500).json({ msg: "Server error while fetching current ride for driver" })
  }
}

exports.completeRide = async (req, res) => {
  try {
    const rideId = req.params.id
    const driverId = req.user.id

    const ride = await Ride.findOne({
      _id: rideId,
      driver: driverId,
      status: "in-progress",
    })

    if (!ride) {
      return res.status(404).json({ msg: "Ride not found or not in progress" })
    }

    ride.status = "completed"
    await ride.save()

    // Set driver availability back to true
    await User.findByIdAndUpdate(driverId, { isAvailable: true })

    console.log(`Driver ${driverId} availability set to true after completing ride ${rideId}`)

    res.json({ msg: "Ride completed successfully", ride })
  } catch (err) {
    console.error("Error completing ride:", err.message)
    res.status(500).send("Server error while completing ride")
  }
}

exports.updateDriverAvailability = async (req, res) => {
  try {
    const driverId = req.user.id
    const { isAvailable } = req.body

    const updatedDriver = await User.findByIdAndUpdate(driverId, { isAvailable }, { new: true })

    if (!updatedDriver) {
      return res.status(404).json({ msg: "Driver not found" })
    }

    console.log(`Driver ${driverId} availability manually updated to ${isAvailable}`)

    res.json({ msg: "Driver availability updated successfully", driver: updatedDriver })
  } catch (err) {
    console.error("Error updating driver availability:", err.message)
    res.status(500).send("Server error while updating driver availability")
  }
}

exports.getRideHistory = async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10

    let query = {}
    if (userRole === "user") {
      query = { user: userId }
    } else if (userRole === "driver") {
      query = { driver: userId }
    }

    const totalRides = await Ride.countDocuments(query)
    const totalPages = Math.ceil(totalRides / limit)

    const rides = await Ride.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name")
      .populate("driver", "name vehicleDetails")

    res.json({
      rides,
      currentPage: page,
      totalPages,
      totalRides,
    })
  } catch (err) {
    console.error("Error fetching ride history:", err.message)
    res.status(500).json({ msg: "Server error while fetching ride history" })
  }
}

