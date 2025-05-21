
import moment from 'moment';
import AttendanceModel from '../models/attendanceModule.js';
import userModel from '../models/userModel.js';

// Punch IN
export const markInTime = async (req, res) => {
  try {

    const userId = req.user._id; // from auth middleware

    const date = moment().format('YYYY-MM-DD');

    const existing = await AttendanceModel.findOne({ userId, date });

    if (existing && existing.inTime) {
      return res.status(400).json({ success: false, statusCode: 400, message: 'Already punched in today' });
    }

    const inTime = new Date();

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
    const date = moment().format('YYYY-MM-DD');

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

    const outTime = new Date();

    const durationMs = new Date(outTime) - new Date(attendance.inTime);
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
    const date = moment().format('YYYY-MM-DD');

    const attendance = await AttendanceModel.findOne({ userId, date });

    let todayStatus = 'Absent';

    if (attendance && attendance.inTime) {
      const inTime = moment(attendance.inTime);
      const outTime = attendance.outTime ? moment(attendance.outTime) : null;
      const nineFifteen = moment(`${date} 09:15 AM`, 'YYYY-MM-DD hh:mm A');

      if (inTime.isSameOrBefore(nineFifteen)) {
        todayStatus = 'Present';
      } else if (outTime) {
        const duration = moment.duration(outTime.diff(inTime)).asHours();
        if (duration > 5 && duration < 9) {
          todayStatus = 'Half Day';
        }
      }
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      todayStatus,
      attendance
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      error: err.message
    });
  }
};

export const getAllUsersTodayAttendance = async (req, res) => {
  try {
    const date = moment().format('YYYY-MM-DD');

    const attendances = await AttendanceModel.find({ date }).populate('userId', 'name email'); // assuming userId is a reference

    const nineFifteen = moment(`${date} 09:15 AM`, 'YYYY-MM-DD hh:mm A');

    const result = attendances.map(attendance => {
      let todayStatus = 'Absent';

      if (attendance.inTime) {
        const inTime = moment(attendance.inTime);
        const outTime = attendance.outTime ? moment(attendance.outTime) : null;

        if (inTime.isSameOrBefore(nineFifteen)) {
          todayStatus = 'Present';
        } else if (outTime) {
          const duration = moment.duration(outTime.diff(inTime)).asHours();
          if (duration > 5 && duration < 9) {
            todayStatus = 'Half Day';
          }
        }
      }

      return {
        user: attendance.userId,
        date: attendance.date,
        inTime: attendance.inTime,
        outTime: attendance.outTime,
        todayStatus,
      };
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      error: err.message
    });
  }
};

export const getSingleUserFullAttendanceHistory = async (req, res) => {
  try {
    const userId = req.userId;

    const records = await AttendanceModel.find({ userId }).sort({ date: -1 });

    const formattedRecords = records.map(record => {
      const inTime = record.inTime ? moment(record.inTime) : null;
      const outTime = record.outTime ? moment(record.outTime) : null;
      const cutoffTime = moment(record.date).hour(9).minute(15); // 9:15 AM

      let duration = null;
      let status = 'Absent';

      if (inTime && outTime) {
        const diff = moment.duration(outTime.diff(inTime));
        const hours = diff.asHours();
        duration = `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;

        if (hours >= 9 && inTime.isSameOrBefore(cutoffTime)) {
          status = 'Present';
        } else if (hours > 5) {
          status = 'Half Day';
        }
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
      message: 'Failed to fetch attendance',
      error: error.message
    });
  }
};

export const getAllUsersFullAttendanceHistory = async (req, res) => {
  try {
    const records = await AttendanceModel.find();
    const users = await userModel.find({}, '_id name'); // get user list (name optional)

    // Group records by userId
    const attendanceByUser = {};
    records.forEach(record => {
      const userId = record.userId;
      if (!attendanceByUser[userId]) attendanceByUser[userId] = [];
      attendanceByUser[userId].push(record);
    });

    const result = users.map(user => {
      const userAttendance = attendanceByUser[user._id] || [];

      const formatted = userAttendance.map(record => {
        const inTime = record.inTime ? moment(record.inTime) : null;
        const outTime = record.outTime ? moment(record.outTime) : null;
        const cutoffTime = moment(record.date).hour(9).minute(15); // 9:15 AM
        let duration = null;
        let status = 'Absent';

        if (inTime && outTime) {
          const diff = moment.duration(outTime.diff(inTime));
          const hours = diff.asHours();
          duration = `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;

          if (hours >= 9 && inTime.isSameOrBefore(cutoffTime)) {
            status = 'Present';
          } else if (hours > 5) {
            status = 'Half Day';
          }
        }

        if (inTime && inTime.isAfter(cutoffTime)) {
          status = 'Half Day';
        }

        return {
          date: moment(record.date).format('YYYY-MM-DD'),
          inTime: inTime ? inTime.format('hh:mm A') : null,
          outTime: outTime ? outTime.format('hh:mm A') : null,
          duration,
          status
        };
      });

      return {
        userId: user._id,
        name: user.name,
        attendance: formatted.sort((a, b) => new Date(a.date) - new Date(b.date))
      };
    });

    res.status(200).json({
      success: true,
      message: "All users' attendance history fetched successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching full attendance history',
      error: error.message
    });
  }
};


