
import moment from 'moment-timezone';
import AttendanceModel from '../models/attendanceModule.js';
import userModel from '../models/userModel.js';
import holidayModel from '../models/holidayModule.js';
import { formatAttendanceRecord } from '../utils/attendanceUtils.js';
import LeaveModel from '../models/leaveModel.js';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

// Punch IN
export const markInTime = async (req, res) => {
  try {

    const userId = req.user._id;
    const user = await userModel.findById(userId);
    const userTimeZone = user.timeZone || 'UTC';
    const date = moment().tz(userTimeZone).format('YYYY-MM-DD');
    const existing = await AttendanceModel.findOne({ userId, date });

    if (existing && existing.inTime) {
      return res.status(400).json({ success: false, statusCode: 400, message: 'Already punched in today' });
    }


    let todayStatus ;
   const inTime = moment().tz(userTimeZone).toDate();
    const nineFifteen = moment(`${date} 09:15 AM`, 'YYYY-MM-DD hh:mm A').tz(userTimeZone);
     if (moment(inTime).isSameOrBefore(nineFifteen)) {
        todayStatus = 'Present';
        
      }else {
        todayStatus = 'Half Day';
      }

    const attendance = await AttendanceModel.findOneAndUpdate(
      { userId, date },
      { $set: { inTime, status: todayStatus } },
      { upsert: true, new: true }
    );

    res.status(200).json({
        success: true,
        statusCode: 200, 
        message: 'Punched IN successfully', 
        attendance 
    });
  } catch (err) {
    res.status(500).json({ success: false, statusCode: 500, error: err.message });
  }
};

// Punch OUT
export const markOutTime = async (req, res) => {
  try {

    const userId = req.user._id;
    const userTimeZone = req.user.timeZone || 'UTC';
    const date = moment().tz(userTimeZone).format('YYYY-MM-DD');

    const attendance = await AttendanceModel.findOne({ userId, date });
     const inTime = moment(attendance.inTime).tz(userTimeZone);
      const nineFifteen = moment(`${date} 09:15 AM`, 'YYYY-MM-DD hh:mm A').tz(userTimeZone);
  
    if (!attendance || !attendance.inTime) {
      return res.status(400).json({ success: false, statusCode: 400, message: 'You must punch in first' });
    }

    if (attendance.outTime) {
      return res.status(400).json({ 
        success: false,
        statusCode: 400,
        message: 'Already punched out today' 
      });
    }

    const outTime = moment().tz(userTimeZone).toDate();
    

    const durationMs = outTime - new Date(attendance.inTime);
    const duration = moment.utc(durationMs).format('HH:mm:ss');

    attendance.outTime = outTime;
    attendance.duration = duration;
    await attendance.save();

    let todayStatus ;
      if (inTime.isSameOrBefore(nineFifteen)) {
        todayStatus = 'Present';
      } else if (outTime) {
        // const duration = moment.duration(outTime.diff(inTime)).asHours();
        const duration = moment.duration(moment(outTime).diff(inTime)).asHours();

        // duration > 5 && duration < 9
        if (duration < 9) {
          todayStatus = 'Half Day';
        }
      } else {
        todayStatus = 'Half Day';
      }
      
    const attendanceStatus = await AttendanceModel.findOneAndUpdate(
      { userId, date },
      { $set: {status: todayStatus } },
      { upsert: true, new: true }
    );

    await attendanceStatus.save();

    res.status(200).json({ 
        success: true,
        statusCode: 200,
        message: 'Punched OUT successfully',
        attendanceStatus
    });
  } catch (err) {
    res.status(500).json({ success: false, statusCode: 500, error: err.message });
  }
};

// Get today's attendance
export const getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("Fetching today's attendance for user:", userId);
    const date = moment().format('YYYY-MM-DD');
    const holiday = await holidayModel.findOne({ date });

    if (holiday) {
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Today is a holiday',
        date,
        attendance: {
          userId,
          date,
          inTime: null,
          outTime: null,
          status: 'Holiday'
        }
      });
    }
    const attendance = await AttendanceModel.findOne({ date, userId  }).populate('userId', 'first_name last_name email status userId');
    console.log("Today's Attendance:", attendance);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Today\'s attendance fetched successfully',
      date,
      attendance
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Failed to fetch today\'s attendance',
      error: err.message
    });
  }
}

// Get all users' attendance for today
export const getAllUsersTodayAttendance = async (req, res) => {

  try {
    const date = moment().format('YYYY-MM-DD');

    const attendances = await AttendanceModel.find({ date }).populate('userId', 'first_name last_name email status userId').sort({ inTime: 1, outTime:1 });

    const result = await Promise.all(attendances.map(async (attendance) => {
            const user= await userModel.findById(attendance.User);

          return {
            user: attendance.userId ? {
              userId: attendance.userId.userId || null,
              firstName: attendance.userId.first_name || null,
              lastName: attendance.userId.last_name || null,
              email: attendance.userId.email || null
            } : {
               userId: user._id  || null,
              firstName: user.first_name || null,
              lastName: user.last_name || null,
              email: user.email || null

            },
            date: attendance.date || null,
            inTime: attendance.inTime || null,
            outTime: attendance.outTime || null,
            duration: attendance.duration || null,
            status : attendance.status || null
          };
        }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'All users\' attendance for today fetched successfully',
      date,
      totalUsers: result.length,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Failed to fetch all users\' attendance for today',
      error: err.message
    });
  }
}


// Get single user's full attendance history
export const getSingleUserFullAttendanceHistory = async (req, res) => {
  try {

    const userId = req.user._id;  

    // 1. Fetch Attendance Records
    const attendanceRecords = await AttendanceModel.find({ userId })
      .populate('userId', 'first_name last_name email status userId joining_date');

    // 2. Fetch Leave Records
    const leaveRecords = await LeaveModel.find({ userId })
      .populate('Attendance');

      console.log("attendanceRecords", attendanceRecords);


    res.status(200).json({
      success: true,
      message: 'Attendance fetched successfully',
      data: {
        attendance: attendanceRecords,
        leaves: leaveRecords
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Failed to fetch attendance',
      error: error.message
    });
  }
};

// Get all users' full attendance history
export const getAllUsersFullAttendanceHistory = async (req, res) => {
  try {
    const records = await AttendanceModel.find();
    const users = await userModel.find({});

    const attendanceByUser = {};

    records.forEach(recordDoc => {
      if (!recordDoc.userId) return;

      const user = users.find(u => u._id?.toString() === recordDoc.userId?.toString());
      if (!user) return;
    
      const record = recordDoc.toObject();
      const userIdStr = user._id.toString();

      if (!attendanceByUser[userIdStr]) {
        attendanceByUser[userIdStr] = {
          userId: userIdStr,
          empId: user?.userId,
          userName: `${user.first_name} ${user.last_name}`,
          userEmail: user.email,
          userPhone: user.phone,
          joining_date: user.joining_date,
          attendanceHistory: [],
        };
      }

      attendanceByUser[userIdStr].attendanceHistory.push(record);
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "All users' attendance history fetched successfully",
      data: Object.values(attendanceByUser), // Convert to array if needed
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Error fetching full attendance history',
      error: error.message,
    });
  }
};

// Get All Users Attendance Report export to Excel 
export const getAllUsersAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start date and end date are required' });
    }

    const start = moment(startDate).startOf('day');
    const end = moment(endDate).endOf('day');
    const dateRange = [];

    for (let m = moment(start); m.isSameOrBefore(end); m.add(1, 'days')) {
      dateRange.push(m.format('YYYY-MM-DD'));
    }

    const records = await AttendanceModel.find({
      date: { $gte: start.toDate(), $lte: end.toDate() }
    }).populate('userId', 'first_name last_name email status');

    const userMap = new Map();

    records.forEach(record => {
      const user = record.userId;
      const userKey = user._id.toString();

      if (!userMap.has(userKey)) {
        userMap.set(userKey, {
          userId: user._id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          status: user.status,
          attendance: {},
          presentCount: 0
        });
      }

      const formattedDate = moment(record.date).format('YYYY-MM-DD');
      const userData = userMap.get(userKey);
      userData.attendance[formattedDate] = record.status;

      if (record.status.toLowerCase() === 'present') {
        userData.presentCount += 1;
      }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance Report');

    const columns = [
      { header: 'User ID', key: 'userId', width: 25 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      ...dateRange.map(date => ({ header: date, key: date, width: 15 })),
      { header: 'Total Present', key: 'totalPresent', width: 15 }
    ];
    sheet.columns = columns;

    for (const [, user] of userMap.entries()) {
      const row = {
        userId: user.userId.toString(),
        name: user.name,
        email: user.email,
        status: user.status,
        totalPresent: user.presentCount
      };

      dateRange.forEach(date => {
        row[date] = user.attendance[date] || 'N/A';
      });

      sheet.addRow(row);
    }

    // 👇 File Save Path
    const fileName = `Attendance_Report_${startDate}_to_${endDate}.xlsx`;
    const filePath = path.join('downloads', fileName);

    // Ensure downloads folder exists
    if (!fs.existsSync('downloads')) {
      fs.mkdirSync('downloads');
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Attendance_Report_${startDate}_to_${endDate}.xlsx"`);

    await workbook.xlsx.writeFile(filePath);

    return res.status(200).json({
      success: true,
      message: 'Excel file generated successfully',
      downloadUrl: `/downloads/${fileName}`
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message
    });
  }
};




