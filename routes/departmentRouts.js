
import express from "express";
import { authenticate } from "../middleware/auth.js";
import { getAllDepartments, getDepartmentById } from "../controllers/departmentController.js";

const departmentRouter = express.Router();

departmentRouter.use(authenticate);

departmentRouter.get("/", getAllDepartments);
departmentRouter.get("/:id", getDepartmentById);

export default departmentRouter;
