import User from "../models/user.js";

import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { config } from "dotenv"
import { generateRandomPassword } from "../utils/randomPassword.js";
import { upload } from "../config/cloudinary.js";
config()

const JWT_SECRET = process.env.JWT_SECRET



export const registerUser = async (req, res) => {
    
    console.log("I got hit o");
    

  try {
    const {
      fullname,
      username,
      email,
      phone,
      address,
      gender,
      role,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Username or email already exists",
      });
    }

    // Handle profile picture upload
    let profilePictureUrl = null;
    if (req.files && req.files.profilePicture) {
      const file = req.files.profilePicture;

      // Upload to Cloudinary
      const result = await upload(file.tempFilePath, "users/profile-pictures");

      profilePictureUrl = result.secure_url;
    }

    // Generate temporary password
    const tempPassword = generateRandomPassword();
   

    // Create new user
    const newUser = new User({
      fullname,
      username,
      email,
      phone,
      address,
      gender,
      role,
      profilePicture: profilePictureUrl,
      tempPassword: tempPassword, // temp password 
    });

    await newUser.save();

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        fullname: newUser.fullname,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        profilePicture: newUser.profilePicture,
        temporalPassword: tempPassword, // send plain temp password once
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};


// controllers/authController.js
// controllers/authController.js
export const loginUser = async (req, res) => {
  console.log("Login endpoint hit");

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const user = await User.findOne({ username });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Username or password is incorrect" });
    }

    console.log("User found:", user.fullname);
    console.log("Stored tempPassword:", user.tempPassword);
    console.log("Has real password:", !!user.password);

    let isValid = false;
    let usingTempPassword = false;

    // 1. Check real (hashed) password first
    if (user.password) {
      isValid = await bcrypt.compare(password, user.password);
    }

    // 2. If not, check tempPassword (plain text)
    if (!isValid && user.tempPassword === password) {
      isValid = true;
      usingTempPassword = true;
    }

    if (!isValid) {
      return res.status(401).json({ message: "Username or password is incorrect" });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.fullname },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      role: user.role,
      user: {
        id: user._id,
        fullname: user.fullname,
        username: user.username,
        profilePicture: user.profilePicture,
        hasRealPassword: !!user.password,
        usingTempPassword,
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};