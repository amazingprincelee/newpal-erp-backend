// controllers/userController.js
import User from "../models/user.js";
import { generateRandomPassword } from "../utils/randomPassword.js";
import bcrypt from "bcrypt";
import { upload } from "../config/cloudinary.js";

// GET all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-tempPassword -password");
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE user
export const updateUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullname, username, email, phone, address, gender, role } = req.body;

    let profilePicture = null;
    if (req.files?.profilePicture) {
      const result = await upload(req.files.profilePicture.tempFilePath, "users/profile-pictures");
      profilePicture = result.secure_url;
    }

    const updated = await User.findByIdAndUpdate(
      id,
      {
        fullname, username, email, phone, address, gender, role,
        ...(profilePicture && { profilePicture })
      },
      { new: true }
    ).select("-tempPassword -password");

    res.json({ message: "User updated", user: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE user
export const deleteUserById = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }
};

// RESET user password
export const resetUserPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const newTempPassword = generateRandomPassword();
    const hashed = await bcrypt.hash(newTempPassword, 10);

    user.tempPassword = hashed;
    user.hasChangedPassword = false;
    await user.save();

    res.json({ message: "Password reset", temporalPassword: newTempPassword });
  } catch (error) {
    res.status(500).json({ message: "Reset failed" });
  }
};