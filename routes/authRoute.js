import express from "express";
import {registerUser, loginUser} from "../controllers/authController.js";
import { loginValidator} from "../middlewares/authValidator.js"
const router = express.Router();


router.post('/register', registerUser )
router.post('/login', loginValidator, loginUser )




export default router