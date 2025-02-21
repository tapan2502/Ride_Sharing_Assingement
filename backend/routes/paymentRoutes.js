const express = require("express")
const router = express.Router()
const paymentController = require("../controllers/paymentController")
const auth = require("../middleware/auth")
const roleCheck = require("../middleware/roleCheck")

router.post("/initiate/:id", auth, roleCheck(["user"]), paymentController.initiatePayment)
router.post("/confirm", auth, roleCheck(["user"]), paymentController.confirmPayment)
router.get("/history", auth, roleCheck(["admin"]), paymentController.getPaymentHistory)

module.exports = router

