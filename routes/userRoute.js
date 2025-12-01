// routes/userRoute.js
import express from "express";
import { authenticate } from "../middlewares/authMiddleware.js"
import {
  getAllUsers,
  updateUserById,
  deleteUserById,
  resetUserPassword,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/", authenticate, getAllUsers);
router.put("/:id", authenticate, updateUserById);
router.delete("/:id", authenticate, deleteUserById);
router.post("/:id/reset-password", authenticate, resetUserPassword);

export default router;