import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { getOverallEmployeeReport } from '../controllers/reportsController.js';
import { getAllUsersAttendanceReport } from '../controllers/attendanceController.js';
import { getAllUsersLeaveReport } from '../controllers/leaveController.js';


const reportRouter = express.Router();
reportRouter.use(authenticate)


reportRouter.get('/over_all_report', authorizeRoles('admin', 'hr', 'employee'), getOverallEmployeeReport);
reportRouter.get('/all_user_attendance_report', authenticate, authorizeRoles('admin', 'hr'), getAllUsersAttendanceReport);
reportRouter.get('/all_user_leave_report', authenticate,  authorizeRoles('admin', 'hr'), getAllUsersLeaveReport);




export default reportRouter;