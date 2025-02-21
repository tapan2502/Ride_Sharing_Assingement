const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")
const connectDB = require("./config/db")
const socketManager = require("./utils/socketManager")
const driverRoutes = require("./routes/driverRoutes")

dotenv.config()

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Connect to MongoDB
const connectWithRetry = () => {
  console.log("Attempting to connect to MongoDB...")
  connectDB().catch((err) => {
    console.error("Failed to connect to MongoDB on startup - retrying in 5 sec", err)
    setTimeout(connectWithRetry, 5000)
  })
}

connectWithRetry()

// Routes
app.use("/api/auth", require("./routes/authRoutes"))
app.use("/api/ride", require("./routes/rideRoutes"))
app.use("/api/payment", require("./routes/paymentRoutes"))
app.use("/api/admin", require("./routes/adminRoutes"))
app.use("/api/driver", driverRoutes)
app.use("/api/drivers", driverRoutes)

const PORT = process.env.PORT || 5000

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// Set up WebSocket with proper CORS
const io = socketManager(server)

// Handle WebSocket connections
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id)

  socket.on("joinRoom", (userId) => {
    socket.join(userId)
    console.log(`User ${userId} joined their room`)
  })

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id)
  })
})

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...")
  console.error(err)
  server.close(() => {
    process.exit(1)
  })
})

