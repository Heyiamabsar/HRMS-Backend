import express from "express";
import multer from "multer";

import { storage } from "../config/cloudinary.config.js";
import {
  uploadExcelToCloudinary,
  fetchExcelFromCloudinary,
} from "../controllers/cloudExcelController.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";

const cloudExcelRouter = express.Router();
// const upload = multer({ storage });
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

cloudExcelRouter.use(authenticate);


cloudExcelRouter.post('/upload_cloud_excel',
  upload.single('excel'),
  uploadExcelToCloudinary
);

cloudExcelRouter.get(
  "/fetch_cloud_excel",
  authorizeRoles("admin", "hr", "employee"),
  fetchExcelFromCloudinary
);

export default cloudExcelRouter;
