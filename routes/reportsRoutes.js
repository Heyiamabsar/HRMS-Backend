import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { getAllUsersAttendanceReport, getAllUsersLeaveReport, getAllUsersPayrollReport, getOverallEmployeeReport } from '../controllers/reportsController.js';



const reportRouter = express.Router();
reportRouter.use(authenticate)


reportRouter.get('/over_all_report', authorizeRoles('admin', 'hr'), getOverallEmployeeReport);
reportRouter.get('/all_user_attendance_report', authenticate, authorizeRoles('admin', 'hr'), getAllUsersAttendanceReport);
reportRouter.get('/all_user_leave_report', authenticate,  authorizeRoles('admin', 'hr'), getAllUsersLeaveReport);
reportRouter.get('/all_user_payroll_report', authenticate,  authorizeRoles('admin', 'hr'), getAllUsersPayrollReport);




export default reportRouter;