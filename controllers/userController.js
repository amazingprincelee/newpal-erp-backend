// controllers/userController.js
import User from "../models/user.js";
import { generateRandomPassword } from "../utils/randomPassword.js";
import bcrypt from "bcrypt";
import { upload } from "../config/cloudinary.js";

// GET all users (excluding super-admin, including temporalPassword)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'super-admin' } })
      .select("-password") // Exclude only the main password, keep temporalPassword
      .sort({ createdAt: -1 });
    
    res.json({ users });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE user
export const updateUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullname, username, email, phone, address, gender, role } = req.body;

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent updating super-admin
    if (existingUser.role === 'super-admin') {
      return res.status(403).json({ message: "Cannot update super-admin user" });
    }

    let profilePicture = existingUser.profilePicture;
    if (req.files?.profilePicture) {
      const result = await upload(req.files.profilePicture.tempFilePath, "users/profile-pictures");
      profilePicture = result.secure_url;
    }

    const updated = await User.findByIdAndUpdate(
      id,
      {
        fullname, 
        username, 
        email, 
        phone, 
        address, 
        gender, 
        role,
        profilePicture
      },
      { new: true, runValidators: true }
    ).select("-password"); // Keep temporalPassword visible

    res.json({ message: "User updated", user: updated });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE user
export const deleteUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deleting super-admin
    if (user.role === 'super-admin') {
      return res.status(403).json({ message: "Cannot delete super-admin user" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Delete failed" });
  }
};

// RESET user password
export const resetUserPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent resetting super-admin password
    if (user.role === 'super-admin') {
      return res.status(403).json({ message: "Cannot reset super-admin password" });
    }

    const newTempPassword = generateRandomPassword();
    const hashed = await bcrypt.hash(newTempPassword, 10);

    user.tempPassword = hashed;
    user.temporalPassword = newTempPassword; // Store plain text for admin to see
    user.hasChangedPassword = false;
    await user.save();

    res.json({ 
      message: "Password reset successfully", 
      temporalPassword: newTempPassword 
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Reset failed" });
  }
};