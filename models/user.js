import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    profilePhoto: String,
    fullname: {type: String, required: true},
    username: {type: String, required: true, unique: true},
    email: {type: String, required: true},
    phone: {type: String, required: true},
    address: {type: String, required: true},
    gender: {type: String, required: true, enum: ["male", "female"]}

})


const User = mongoose.model("User", userSchema);

export default User