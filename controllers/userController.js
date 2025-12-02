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

    user.password = hashed;
    user.tempPassword = newTempPassword; // Store plain text for admin to see
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


// CHANGE password (User changes from temporal to permanent password)
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id; // From authenticate middleware
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password (check both tempPassword and password)
    let isCurrentPasswordValid = false;

    // If user hasn't changed password yet, verify against tempPassword
    if (!user.hasChangedPassword && user.tempPassword) {
      isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.tempPassword);
    } 
    // If user has changed password, verify against main password
    else if (user.password) {
      isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    }

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    user.password = hashedNewPassword;
    user.hasChangedPassword = true;
    user.tempPassword = null; // Clear temporary password
    user.temporalPassword = null; // Clear plain text temporal password
    await user.save();

    res.json({ 
      message: "Password changed successfully",
      hasChangedPassword: true 
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
};