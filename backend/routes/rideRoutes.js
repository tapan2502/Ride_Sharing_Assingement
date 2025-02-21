const express = require("express")
const router = express.Router()
const rideController = require("../controllers/rideController")
const auth = require("../middleware/auth")
const roleCheck = require("../middleware/roleCheck")

// User routes
router.post("/book", auth, roleCheck(["user"]), rideController.bookRide)
router.get("/current", auth, rideController.getCurrentRide)
router.post("/cancel/:id", auth, roleCheck(["user"]), rideController.cancelRide)

// Driver routes
router.post("/accept/:id", auth, roleCheck(["driver"]), rideController.acceptRide)
router.get("/available", auth, roleCheck(["driver"]), rideController.getAvailableRides)
router.get("/current-driver", auth, roleCheck(["driver"]), rideController.getCurrentRideForDriver)

// Admin routes
router.get("/all", auth, roleCheck(["admin"]), rideController.getAllRides)

// New route for ride history
router.get("/history", auth, rideController.getRideHistory)

module.exports = router

