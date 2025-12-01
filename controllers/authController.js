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
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

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
      tempPassword: hashedPassword, // store hashed temp password
      hasChangedPassword: false, // optional: track if user changed temp password
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


// controllers/authController.js (or wherever your login is)
export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const user = await User.findOne({ username }).select("+password +tempPassword");
    if (!user) {
      return res.status(401).json({ message: "Username or password is incorrect" });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: "Account is deactivated. Contact admin." });
    }

    // Check BOTH passwords — whichever matches wins
    const realPasswordValid = user.password 
      ? await bcrypt.compare(password, user.password) 
      : false;

    const tempPasswordValid = user.tempPassword 
      ? await bcrypt.compare(password, user.tempPassword) 
      : false;

    if (!realPasswordValid && !tempPasswordValid) {
      return res.status(401).json({ message: "Username or password is incorrect" });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.fullname },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Optional: tell frontend which password was used (for UX)
    const usedTempPassword = !realPasswordValid && tempPasswordValid;

    res.status(200).json({
      message: "Login successful",
      token,
      role: user.role,
      user: {
        id: user._id,
        fullname: user.fullname,
        username: user.username,
        profilePicture: user.profilePicture,
        hasRealPassword: !!user.password,           
        usingTempPassword: usedTempPassword,        
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/change-password (protected route)
export const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id; // from JWT middleware

    const hashed = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(userId, {
      password: hashed,
      // tempPassword stays — they can still use it if they want!
      // or you can delete it: tempPassword: undefined
    });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update password" });
  }
};