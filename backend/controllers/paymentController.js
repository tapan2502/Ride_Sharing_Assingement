const Ride = require("../models/Ride")
const fetch = require("node-fetch")
const PaymentHistory = require("../models/PaymentHistory")

exports.initiatePayment = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
    if (!ride) {
      return res.status(404).json({ msg: "Ride not found" })
    }
    if (ride.status !== "accepted") {
      return res.status(400).json({ msg: "Ride is not in accepted state" })
    }

    const mockCartData = {
      userId: ride.user.toString(),
      date: new Date().toISOString().split("T")[0],
      products: [
        {
          productId: 1,
          quantity: 1,
        },
      ],
    }

    const response = await fetch("https://fakestoreapi.com/carts", {
      method: "POST",
      body: JSON.stringify(mockCartData),
      headers: { "Content-Type": "application/json" },
    })

    if (!response.ok) {
      throw new Error("Failed to initiate mock payment")
    }

    const paymentData = await response.json()

    ride.paymentStatus = "pending"
    await ride.save()

    res.json({
      msg: "Payment initiated",
      paymentId: paymentData.id,
      amount: ride.fare,
    })
  } catch (err) {
    console.error("Payment initiation error:", err.message)
    res.status(500).send("Server error during payment initiation")
  }
}

exports.confirmPayment = async (req, res) => {
  try {
    const { paymentId, rideId } = req.body
    const ride = await Ride.findById(rideId)

    if (!ride) {
      return res.status(404).json({ msg: "Ride not found" })
    }

    if (ride.paymentStatus !== "pending") {
      return res.status(400).json({ msg: "No pending payment for this ride" })
    }

    // Simulate payment confirmation
    const mockConfirmationResponse = await fetch(`https://fakestoreapi.com/carts/${paymentId}`, {
      method: "PUT",
      body: JSON.stringify({ paid: true }),
      headers: { "Content-Type": "application/json" },
    })

    if (!mockConfirmationResponse.ok) {
      throw new Error("Failed to confirm mock payment")
    }

    ride.paymentStatus = "completed"
    ride.status = "completed" // Update ride status to completed
    await ride.save()

    // Create payment history record
    await PaymentHistory.create({
      ride: ride._id,
      user: ride.user,
      driver: ride.driver,
      amount: ride.fare,
      paymentMethod: ride.paymentMethod,
    })

    res.json({ msg: "Payment successful", ride })
  } catch (err) {
    console.error("Payment confirmation error:", err.message)
    res.status(500).send("Server error during payment confirmation")
  }
}

exports.getPaymentHistory = async (req, res) => {
  try {
    const paymentHistory = await PaymentHistory.find()
      .populate("ride", "pickup.address dropoff.address")
      .populate("user", "name")
      .populate("driver", "name")
      .sort({ createdAt: -1 })

    res.json(paymentHistory)
  } catch (err) {
    console.error("Error fetching payment history:", err.message)
    res.status(500).send("Server error while fetching payment history")
  }
}

