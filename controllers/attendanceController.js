
import moment from 'moment-timezone';
import AttendanceModel from '../models/attendanceModule.js';
import userModel from '../models/userModel.js';
import holidayModel from '../models/holidayModule.js';
import { formatAttendanceRecord } from '../utils/attendanceUtils.js';


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

   const inTime = moment().tz(userTimeZone).toDate();

    const attendance = await AttendanceModel.findOneAndUpdate(
      { userId, date },
      { $set: { inTime } },
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

    res.status(200).json({ 
        success: true,
        statusCode: 200,
        message: 'Punched OUT successfully',
        attendance
    });
  } catch (err) {
    res.status(500).json({ success: false, statusCode: 500, error: err.message });
  }
};

// Get today's attendance
export const getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const userTimeZone = req.user.timeZone || 'UTC';
    const date = moment().tz(userTimeZone).format('YYYY-MM-DD');

    const attendance = await AttendanceModel.findOne({ userId, date });

    let todayStatus = 'Absent';

    const holiday = await holidayModel.findOne({ date });

    if (holiday) {
      todayStatus = 'Holiday';
    } else  if (attendance && attendance.inTime) {
    const inTime = moment(attendance.inTime).tz(userTimeZone);
      const outTime = attendance.outTime ? moment(attendance.outTime).tz(userTimeZone) : null;
      const nineFifteen = moment(`${date} 09:15 AM`, 'YYYY-MM-DD hh:mm A').tz(userTimeZone);

      if (inTime.isSameOrBefore(nineFifteen)) {
        todayStatus = 'Present';
      } else if (outTime) {
        const duration = moment.duration(outTime.diff(inTime)).asHours();
        // duration > 5 && duration < 9
        if (duration < 9) {
          todayStatus = 'Half Day';
        }
      } else {
        todayStatus = 'Half Day';
      }

      // if (inTime.isSameOrBefore(nineFifteen)) {
      //   todayStatus = 'Present';
      // } else if (outTime) {
      //   const duration = moment.duration(outTime.diff(inTime)).asHours();
      //   // duration > 5 && duration < 9
      //   if (duration < 9) {
      //     todayStatus = 'Half Day';
      //   }
      // }
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Today\'s attendance fetched successfully',
      date,
      todayStatus,
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
};

// Get all users' attendance for today
export const getAllUsersTodayAttendance = async (req, res) => {

  try {
    const date = moment().format('YYYY-MM-DD');
    const userId = req.user._id;
    // const user = await userModel.findById(userId);
    const userTimeZone = req.user.timeZone || 'UTC';

    const attendances = await AttendanceModel.find({ date }).populate('userId', 'name email');

    const nineFifteen = moment(`${date} 09:15 AM`, 'YYYY-MM-DD hh:mm A').tz(userTimeZone);
    const holiday = await holidayModel.findOne({ date });

    const result = await Promise.all(attendances.map(async (attendance) => {

          let todayStatus = 'Absent';

            if (holiday) {
              todayStatus = 'Holiday';
            } else if (attendance.inTime) {
           const inTime = moment(attendance.inTime).tz(userTimeZone);
           const outTime = attendance.outTime ? moment(attendance.outTime).tz(userTimeZone) : null;

          if (inTime.isSameOrBefore(nineFifteen)) {
            todayStatus = 'Present';
          } else if (outTime) {
            const duration = moment.duration(outTime.diff(inTime)).asHours();
            if (duration < 9) {
              todayStatus = 'Half Day';
            }
          } else {
            todayStatus = 'Half Day';
          }

            // if (inTime.isSameOrBefore(nineFifteen)) {
            //   todayStatus = 'Present';
            // } else if (outTime) {
            //   const duration = moment.duration(outTime.diff(inTime)).asHours();
            //   if (duration < 9) {
            //     todayStatus = 'Half Day';
            //   }
            // }
          }

          return {
            user: attendance.userId,
            date: attendance.date,
            inTime: attendance.inTime,
            outTime: attendance.outTime,
            todayStatus,
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

// Get single user's attendance for a week
export const getSingleUserWeeklyAttendance = async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    const userId = req.user._id;
    console.log("User ID:", req.user);
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'User not found'
      });
    }

    const userTimeZone = user.timeZone || 'UTC';

   if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Please provide both fromDate and toDate'
      });
    }
    // Convert received dates to correct timezone format
    const startDate = moment.tz(fromDate, userTimeZone).startOf('day').toDate();
    const endDate = moment.tz(toDate, userTimeZone).endOf('day').toDate();

    const records = await AttendanceModel.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });

    console.log('Fetched Records:', records);
    const formattedRecords = records.map(record => {
      const inTime = record.inTime ? moment(record.inTime).tz(userTimeZone) : null;
      const outTime = record.outTime ? moment(record.outTime).tz(userTimeZone) : null;
      const cutoffTime = moment(record.date).tz(userTimeZone).hour(9).minute(15); // 9:15 AM

      let duration = null;
      let status = 'Absent';

      if (inTime && outTime) {
        const diff = moment.duration(outTime.diff(inTime));
        const hours = diff.asHours();
        duration = `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;

        if (hours >= 9 && inTime.isSameOrBefore(cutoffTime)) {
          status = 'Present';
        }else{
          status = 'Half Day';
        } 
        // else if (hours > 5) {
        //   status = 'Half Day';
        // }
      }

      return {
        date: moment(record.date).tz(userTimeZone).format('YYYY-MM-DD'),
        inTime: inTime ? inTime.format('hh:mm A') : null,
        outTime: outTime ? outTime.format('hh:mm A') : null,
        duration,
        status
      };
    });

    res.status(200).json({
      success: true,
      message: 'Weekly attendance fetched successfully',
      data: {
        totalDays: formattedRecords.length,
        records: formattedRecords
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Failed to fetch weekly attendance',
      error: error.message
    });
  }
};


// Get single user's full attendance history
export const getSingleUserFullAttendanceHistory = async (req, res) => {
  try {

    const userId = req.user._id;
    const userTimeZone = req.user.timeZone || 'UTC';
    const records = await AttendanceModel.find({ userId }).sort({ date: -1 });

      //  const formattedRecords = records.map(formatAttendanceRecord);

    const formattedRecords = records.map(record => {
      const inTime = record.inTime ? moment(record.inTime).tz(userTimeZone) : null;
      const outTime = record.outTime ? moment(record.outTime).tz(userTimeZone) : null;
      const cutoffTime = moment(record.date).hour(9).minute(15).tz(userTimeZone); // 9:15 AM

      let duration = null;
      let status = 'Absent';

      if (inTime && outTime) {
        const diff = moment.duration(outTime.diff(inTime));
        
        const hours = diff.asHours();
        duration = `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;

        if (hours >= 9 && inTime.isSameOrBefore(cutoffTime)) {
          status = 'Present';
        } 
        // else if (hours > 5) {
        //   status = 'Half Day';
        // }
      }

      return {
        date: moment(record.date).format('YYYY-MM-DD'),
        inTime: inTime ? inTime.format('hh:mm A') : null,
        outTime: outTime ? outTime.format('hh:mm A') : null,
        duration,
        status
      };
    });

    res.status(200).json({
      success: true,
      message: 'Attendance fetched successfully',
      data: {
        totalDays: formattedRecords.length,
        records: formattedRecords
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
export const getAllUsersFullAttendanceHistory = async (req, res) => {
  try {

    const records = await AttendanceModel.find();
    const users = await userModel.find({}, '-attendance -leaves');
    const userTimeZone = req.user.timeZone || 'UTC';

    const attendanceByUser = {};
    records.forEach(record => {
      const userId = record.userId;
      if (!attendanceByUser[userId]) attendanceByUser[userId] = [];
      attendanceByUser[userId].push(record);
    });

    const result = users.map(user => {
      const userAttendance = attendanceByUser[user._id] || [];

      const formatted = userAttendance.map(record => {
        const inTime = record.inTime ? moment(record.inTime).tz(userTimeZone) : null;
        const outTime = record.outTime ? moment(record.outTime).tz(userTimeZone) : null;
        const cutoffTime = moment(record.date).hour(9).minute(15).tz(userTimeZone); // 9:15 AM
        let duration = null;
        let status = 'Absent';

        if (inTime && outTime) {
          const diff = moment.duration(outTime.diff(inTime));
          const hours = diff.asHours();
          duration = `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;
          // && inTime.isSameOrBefore(cutoffTime)
          if (hours >= 9 ) {
            status = 'Present';
          } else {
            status = 'Half Day';
          }
        }

        // if (inTime && inTime.isAfter(cutoffTime)) {
        //   status = 'Half Day';
        // }

        return {
          date: moment(record.date).format('YYYY-MM-DD'),
          inTime: inTime ? inTime.format('hh:mm A') : null,
          outTime: outTime ? outTime.format('hh:mm A') : null,
          duration,
          status
        };
      });

      // const formatted = userAttendance.map(formatAttendanceRecord); 

      return {
        userId: user._id,
        user: user,
        attendance: formatted.sort((a, b) => new Date(a.date) - new Date(b.date))
      };
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "All users' attendance history fetched successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Error fetching full attendance history',
      error: error.message
    });
  }
};


