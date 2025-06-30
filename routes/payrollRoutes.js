import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { addPayrollBasicInfo, exportAllUsersToExcel, getExcelDataById, sendUserDataToExcel } from '../controllers/payrollController.js';

const payrollRouter = express.Router();

payrollRouter.use(authenticate);

payrollRouter.post('/add_payroll_basic_info/:id', authorizeRoles('admin', 'hr'), addPayrollBasicInfo);

payrollRouter.post('/load_all_User_To_Excel', authorizeRoles('admin', 'hr', 'employee'),exportAllUsersToExcel );
payrollRouter.post('/:id', authorizeRoles('admin', 'hr', 'employee'),sendUserDataToExcel );
payrollRouter.get('/:id', authorizeRoles('admin', 'hr', 'employee'),getExcelDataById );


export default payrollRouter;