import express from 'express';
import {  getAllUsersFullAttendanceHistory, getAllUsersTodayAttendance, getSingleUserFullAttendanceHistory, getTodayAttendance, markInTime, markOutTime } from '../controllers/attendanceController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';


const attendanceRouter = express.Router();

attendanceRouter.post('/in', authenticate, authorizeRoles('admin', 'hr', 'employee'), markInTime);
attendanceRouter.post('/out', authenticate, authorizeRoles('admin', 'hr', 'employee'), markOutTime);

attendanceRouter.get('/today_attendance', authenticate, authorizeRoles('admin', 'hr', 'employee'), getTodayAttendance);
attendanceRouter.get('/single_user_attendance_history', authenticate, authorizeRoles('admin', 'hr', 'employee'), getSingleUserFullAttendanceHistory);

attendanceRouter.get('/all_users_today_attendance', authenticate, authorizeRoles('admin', 'hr'), getAllUsersTodayAttendance);
attendanceRouter.get('/all_user_attendance_history', authenticate, authorizeRoles('admin', 'hr'), getAllUsersFullAttendanceHistory);

export default attendanceRouter;
