import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    profilePicture: { type: String },
    fullname: {type: String , required: true},
    username: {type: String, required: true, unique: true},
    email: {type: String},
    phone: {type: String, required: true},
    password: {type: String, default: null},
    tempPassword: {type: String, required: true},
    address: {type: String, required: true},
    gender: {type: String, enum: ["female", "male", "other"]},
    role: {
        type: String, 
        enum: [
            "super-admin", 
            "admin", 
            "gate", 
            "security", 
            "weighbridge",
            "inventory",
            "procurement",
            "sales",
            "dispatch",
            "production",
            "qa",
            "lab",
            "finance"
        ]},

         permissions: {
        gate: { type: Boolean, default: false },
        weighbridge: { type: Boolean, default: false },
        inventory: { type: Boolean, default: false },
        procurement: { type: Boolean, default: false },
        sales: { type: Boolean, default: false },
        dispatch: { type: Boolean, default: false },
        production: { type: Boolean, default: false },
        qa: { type: Boolean, default: false },
        finance: { type: Boolean, default: false },
        approve: { type: Boolean, default: false }
    },

    isActive: {type: Boolean, default: true},
    createdAt: {type: Date, default: Date.now},   
    updatedAt: {type: Date, default: null} 

})


const User = mongoose.model("User", userSchema);

export default User