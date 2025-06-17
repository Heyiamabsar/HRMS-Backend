
import moment from 'moment-timezone';
import AttendanceModel from '../models/attendanceModule.js';
import userModel from '../models/userModel.js';
import holidayModel from '../models/holidayModule.js';
import { formatAttendanceRecord } from '../utils/attendanceUtils.js';
import LeaveModel from '../models/leaveModel.js';


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
// Admin or HR only
// export const getAllUsersFullAttendanceHistory = async (req, res) => {
//   try {

//     const records = await AttendanceModel.find();
//     const users = await userModel.find({});
//     console.log('Fetched Records:', users);
//     // const userTimeZone = req.user.timeZone || 'UTC';
// // attendanceByUser with user name and email
//     const attendanceByUser = {};
//     records.forEach(record => {

//  records.forEach(record => {
//   const user = users.find(u => u._id === record.userId);
//   if (user) {
//     record.userName = `${user.first_name} ${user.last_name}`;
//     record.userEmail = user.email;
//   }
// });
    

//       const userId = record.userId;

//       if (!attendanceByUser[userId]) attendanceByUser[userId] = [];
//       attendanceByUser[userId].push(record);
      

//     });

//     res.status(200).json({
//       success: true,
//       statusCode: 200,
//       message: "All users' attendance history fetched successfully",
//       data: attendanceByUser,
      
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       statusCode: 500,
//       message: 'Error fetching full attendance history',
//       error: error.message
//     });
//   }
// };


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






