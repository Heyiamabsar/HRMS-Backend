import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { sendUserDataToExcel } from '../controllers/payrollController.js';

const payrollRouter = express.Router();

payrollRouter.use(authenticate);


payrollRouter.post('/:id', authorizeRoles('admin', 'hr', 'employee'),sendUserDataToExcel );


export default payrollRouter;