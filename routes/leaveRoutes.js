// leaveRoutes.js
import express from 'express';
import {
  applyLeave,
//   getAllLeaves,
//   getLeaveById,
//   updateLeaveStatus,
//   deleteLeave
} from '../controllers/leaveController.js';
import { authorizeRoles } from '../middleware/auth.js';

const leaveRouter = express.Router();

leaveRouter.post('/apply', applyLeave);
// leaveRouter.get('/', getAllLeaves);
// leaveRouter.get('/:id', getLeaveById);
// leaveRouter.put('/:id/status', updateLeaveStatus);
// leaveRouter.delete('/:id', deleteLeave);

export default leaveRouter;