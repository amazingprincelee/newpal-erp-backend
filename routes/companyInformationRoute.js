import express from "express";
import { getCompanyInfo, saveCompanyInfo } from "../controllers/companyInformatiionController.js";

const router = express.Router();

router.get("/", getCompanyInfo);
router.post("/", saveCompanyInfo);

export default router;
