// routes/userRoute.js
import express from "express";
import { authenticate } from "../middlewares/authMiddleware.js"
import {
  getAllUsers,
  updateUserById,
  deleteUserById,
  resetUserPassword,
  changePassword
} from "../controllers/userController.js";

const router = express.Router();

router.get("/", authenticate, getAllUsers);
router.put("/:id", authenticate, updateUserById);
router.delete("/:id", authenticate, deleteUserById);
router.post("/:id/reset-password", authenticate, resetUserPassword);

// User route - change own password
router.post("/change-password", authenticate, changePassword);

export default router;