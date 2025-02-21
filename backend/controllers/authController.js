const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User")

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, licenseNumber, vehicleDetails } = req.body

    let user = await User.findOne({ email })
    if (user) {
      return res.status(400).json({ msg: "User already exists" })
    }

    // Create a new user object based on the role
    const userData = {
      name,
      email,
      password,
      role,
      phone,
      isAvailable: role === "driver", // Set isAvailable to true for drivers
    }

    // If the role is driver, add licenseNumber and vehicleDetails
    if (role === "driver") {
      if (!licenseNumber) {
        return res.status(400).json({ msg: "License number is required for drivers" })
      }
      userData.licenseNumber = licenseNumber
      userData.vehicleDetails = vehicleDetails
    }

    user = new User(userData)

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)

    await user.save()

    console.log(`New ${role} registered:`, { name, email, isAvailable: userData.isAvailable })

    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    }

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }, (err, token) => {
      if (err) throw err
      res.json({ token, role: user.role })
    })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body
    console.log("Login attempt for email:", email)

    const user = await User.findOne({ email })
    if (!user) {
      console.log("User not found for email:", email)
      return res.status(400).json({ msg: "Invalid credentials" })
    }

    console.log("User found:", user.email, "Role:", user.role)

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      console.log("Password mismatch for user:", email)
      return res.status(400).json({ msg: "Invalid credentials" })
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    }

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" }, (err, token) => {
      if (err) {
        console.error("Error signing JWT:", err)
        throw err
      }
      console.log("Login successful for user:", email, "Role:", user.role)
      res.json({ token, role: user.role })
    })
  } catch (err) {
    console.error("Login error:", err.message)
    res.status(500).send("Server error")
  }
}

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password")
    res.json(user)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server error")
  }
}

