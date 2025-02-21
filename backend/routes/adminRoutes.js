const express = require("express")
const router = express.Router()
const adminController = require("../controllers/adminController")
const auth = require("../middleware/auth")
const roleCheck = require("../middleware/roleCheck")

router.get("/rides", auth, roleCheck(["admin"]), adminController.getAllRides)
router.post("/assign-driver/:rideId", auth, roleCheck(["admin"]), adminController.assignDriver)

module.exports = router

