

import express from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import { createBranch, getAllBranches, getBranchById, updateBranch } from "../controllers/branchController.js";

const branchRouter = express.Router()
branchRouter.use(authenticate);

branchRouter.get("/", authorizeRoles('admin','hr') , getAllBranches)
branchRouter.get("/:id", authorizeRoles('admin','hr') , getBranchById)
branchRouter.post("/create", authorizeRoles('admin','hr') , createBranch)
branchRouter.put("/update/:id", authorizeRoles('admin','hr') , updateBranch)


export default branchRouter;