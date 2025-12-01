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


export const loginUser = async (req, res) => {

    const {username, password} = req.body;


    const user = await User.findOne({username: username});

    if(!user){
         res.status(401).json({message: "Username or Password is incorrect"})
    }

    const isMatched = await bcrypt.compare(password, user.password)

    if(isMatched){
        const token = jwt.sign({id: user._id, role: user.role, name: user.fullname}, JWT_SECRET, {expiresIn: 60 * 60 * 24 * 1});
        return res.status(200).json({message: "user successfully logged in", token, role: user.role})
    }else{
        return res.status(401).json({message: "Username or Password is incorrect"})
    }

}