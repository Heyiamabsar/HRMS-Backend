import express from "express";
import { authenticate } from "../middleware/auth.js";
import { getAllDesignations, getDesignationById } from "../controllers/designationController.js";

const designationRouter = express.Router();

designationRouter.use(authenticate);

designationRouter.get("/", getAllDesignations);
designationRouter.get("/:id", getDesignationById);

export default designationRouter;
