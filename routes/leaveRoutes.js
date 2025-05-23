// leaveRoutes.js
import express from 'express';
import {
  applyLeave,
  getAllLeavesStatus,
  getMyLeaves,
  updateLeaveStatus,
//   getAllLeaves,
//   getLeaveById,
//   updateLeaveStatus,
//   deleteLeave
} from '../controllers/leaveController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const leaveRouter = express.Router();

leaveRouter.post('/apply_leave', applyLeave);
leaveRouter.put('/update_leave/:id', updateLeaveStatus);
leaveRouter.get('/:id', authenticate,  authorizeRoles('admin', 'hr', 'employee'),getMyLeaves);
leaveRouter.get('/',getAllLeavesStatus);

// leaveRouter.get('/', getAllLeaves);
// leaveRouter.delete('/:id', deleteLeave);

export default leaveRouter;