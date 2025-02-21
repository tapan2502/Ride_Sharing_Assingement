const express = require("express")
const router = express.Router()
const driverController = require("../controllers/driverController")
const auth = require("../middleware/auth")
const roleCheck = require("../middleware/roleCheck")

router.get("/available", auth, roleCheck(["user"]), driverController.getAvailableDrivers)
router.post("/update-availability", auth, roleCheck(["driver"]), driverController.updateDriverAvailability)

module.exports = router

