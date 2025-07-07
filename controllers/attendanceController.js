import moment from "moment-timezone";
import AttendanceModel from "../models/attendanceModule.js";
import userModel from "../models/userModel.js";
import holidayModel from "../models/holidayModule.js";
import { formatAttendanceRecord } from "../utils/attendanceUtils.js";
import LeaveModel from "../models/leaveModel.js";
import ExcelJS from "exceljs";
import axios from "axios";
import path from "path";
import fs from "fs";
import { sendNotification } from "../utils/notificationutils.js";

// Punch IN
export const markInTime = async (req, res) => {
  try {
    const userId = req.user._id;
    const { location } = req.body;
    const latitude = location?.latitude;
    const longitude = location?.longitude;
    const user = await userModel.findById(userId);
    const userTimeZone = user.timeZone || "UTC";
    const date = moment().tz(userTimeZone).format("YYYY-MM-DD");
    const existing = await AttendanceModel.findOne({ userId, date });


    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Location coordinates (latitude and longitude) are required.",
      });
    }

    if (existing && existing.location?.checkIn.address) {
      return res.status(200).json({
        success: true,
        message: "Address already stored for today",
        address: existing.location.checkIn.address,
        source: "attendance_cache",
      });
    }

    if (existing && existing.inTime) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Already punched in today",
      });
    }

    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      {
        headers: {
          "User-Agent": process.env.NOMINATION_USER_AGENT,
        },
      }
    );
    const address = response?.data?.address;
    const displayName = response?.data?.display_name;
    const userAgent = req.headers["user-agent"] || "";
      let punchedFrom = "Unknown";

      if (/mobile/i.test(userAgent)) {
        punchedFrom = "Mobile";
      } else if (/PostmanRuntime/i.test(userAgent)) {
        punchedFrom = "Postman";
      } else {
        punchedFrom = "Web";
      }

    let todayStatus;
    const inTime = moment().tz(userTimeZone).toDate();
    const nineFifteen = moment(`${date} 09:15 AM`, "YYYY-MM-DD hh:mm A").tz(
      userTimeZone
    );
    if (moment(inTime).isSameOrBefore(nineFifteen)) {
      todayStatus = "Present";
    } else {
      todayStatus = "Half Day";

      await sendNotification({
        forRoles: ["admin", "hr"],
        title: "Late Punch IN Alert",
        message: `${user.first_name} ${
          user.last_name
        } Logged in late today at ${moment(inTime)
          .tz(userTimeZone)
          .format("hh:mm AM")}`,
        link: `/employee/${userId}/profile`,
        type: "user",
        performedBy: user._id,
      });
    }

    const attendanceStatus = await AttendanceModel.findOneAndUpdate(
      { userId, date },
      {
        $set: {
          inTime,
          status: todayStatus,
          location: {
            checkIn:{
            latitude,
            longitude,
            address,
            displayName,
            punchedFrom,
            }
          },
        },
      },
      { upsert: true, new: true }
    );
     await attendanceStatus.save();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Punched IN successfully",
      attendance,
      punchedFrom
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, statusCode: 500, error: err.message });
  }
};

// Punch OUT
export const markOutTime = async (req, res) => {
  try {
    const userId = req.user._id;
    const { location } = req.body;
    const latitude = location?.latitude;
    const longitude = location?.longitude;

     const user = await userModel.findById(userId);

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Location coordinates (latitude and longitude) are required.",
      });
    }

    const userTimeZone = req.user.timeZone || "UTC";
    const date = moment().tz(userTimeZone).format("YYYY-MM-DD");

    const attendance = await AttendanceModel.findOne({ userId, date });
    const holiday = await holidayModel.findOne({ date, isOptional: false });

    const inTime = moment(attendance.inTime).tz(userTimeZone);
    const nineFifteen = moment(`${date} 09:15 AM`, "YYYY-MM-DD hh:mm A").tz(
      userTimeZone
    );

    if (!attendance || !attendance.inTime) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "You must punch in first",
      });
    }

    if (attendance.outTime) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Already punched out today",
      });
    }

    const outTime = moment().tz(userTimeZone).toDate();

    const durationMs = outTime - new Date(attendance.inTime);
    const duration = moment.utc(durationMs).format("HH:mm:ss");

    attendance.outTime = outTime;
    attendance.duration = duration;
    await attendance.save();

        const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      {
        headers: {
          'User-Agent': process.env.NOMINATION_USER_AGENT,
        },
      }
    );

    const address = response?.data?.address;
    const displayName = response?.data?.display_name;
    const userAgent = req.headers["user-agent"] || "";
      let punchedFrom = "Unknown";

      if (/mobile/i.test(userAgent)) {
        punchedFrom = "Mobile";
      } else if (/PostmanRuntime/i.test(userAgent)) {
        punchedFrom = "Postman";
      } else {
        punchedFrom = "Web";
      }

    let todayStatus;
    if (inTime.isSameOrBefore(nineFifteen)) {
      todayStatus = "Present";
    } else if (outTime) {
      // const duration = moment.duration(outTime.diff(inTime)).asHours();
      const duration = moment.duration(moment(outTime).diff(inTime)).asHours();

      // duration > 5 && duration < 9
      if (duration < 9) {
        todayStatus = "Half Day";
      }
    } else {
      todayStatus = "Half Day";
    }

    if (holiday) {
      if (!attendance) {
        attendance = await AttendanceModel.create({
          userId,
          date,
          inTime: null,
          outTime: null,
          status: "Holiday",
        });
      } else if (
        !attendance.inTime &&
        !attendance.outTime &&
        attendance.status !== "Holiday"
      ) {
        attendance.status = "Holiday";
        await attendance.save();
      } else if (attendance.inTime && attendance.outTime) {
        attendance.status = "Over Time";
        todayStatus = "Over Time";
        await attendance.save();
        await sendNotification({
          forRoles: ["admin", "hr"],
          title: `${user.first_name} ${user.last_name}  Working Over Time`,
          message: `${user.first_name} ${user.last_name}  Working as on Holiday as Over Time`,
          // link: `/employee/${employee._id}/profile`,
          type: "user",
          performedBy: req.user._id,
        });
      }
    }

    const attendanceStatus = await AttendanceModel.findOneAndUpdate(
      { userId, date },
      {
        $set: {
          status: todayStatus,
          location: {
            checkOut:{
            latitude,
            longitude,
            address,
            displayName,
            punchedFrom,
            }
          },
        },
      },
      { upsert: true, new: true }
    );

    await attendanceStatus.save();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Punched OUT successfully",
      attendanceStatus,
      punchedFrom
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, statusCode: 500, error: err.message });
  }
};

// Get today's attendance
export const getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const date = moment().format("YYYY-MM-DD");

    const holiday = await holidayModel.findOne({ date, isOptional: false });
    let attendance = await AttendanceModel.findOne({ date, userId });

    if (holiday) {
      if (!attendance) {
        attendance = await AttendanceModel.create({
          userId,
          date,
          inTime: null,
          outTime: null,
          status: "Holiday",
        });
        await attendance.save();
      }
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Today is a holiday",
        date,
        attendance: {
          userId,
          date,
          inTime: null,
          outTime: null,
          status: "Holiday",
          location,
        },
      });
    }

    if (!attendance) {
      attendance = await AttendanceModel.create({
        userId,
        date,
        inTime: null,
        outTime: null,
        status: "Absent",
      });
    } else if (
      !attendance.inTime &&
      !attendance.outTime &&
      attendance.status !== "Absent"
    ) {
      // ❌ No in/out time? Update status to Absent in DB
      attendance.status = "Absent";
      await attendance.save();
    }

    // Populate user details
    await attendance.populate(
      "userId",
      "first_name last_name email status userId department designation salary role"
    );

    // ✅ Return final response
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Today's attendance fetched successfully",
      date,
      attendance,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to fetch today's attendance",
      error: err.message,
    });
  }
};

// Get all users' attendance for today
export const getAllUsersTodayAttendance = async (req, res) => {
  try {
    const date = moment().format("YYYY-MM-DD");

    const attendances = await AttendanceModel.find({ date })
      .populate(
        "userId",
        "first_name last_name email status userId  department designation salary role"
      )
      .sort({ inTime: 1, outTime: 1 });

    const result = await Promise.all(
      attendances.map(async (attendance) => {
        const user = await userModel.findById(attendance.User);

        return {
          user: attendance.userId
            ? {
                userId: attendance.userId.userId || null,
                firstName: attendance.userId.first_name || null,
                lastName: attendance.userId.last_name || null,
                email: attendance.userId.email || null,
                department: attendance.userId.department || null,
                designation: attendance.userId.designation || null,
                salary: attendance.userId.salary || null,
                role: attendance.userId.role || null,
              }
            : {
                userId: user._id || null,
                firstName: user.first_name || null,
                lastName: user.last_name || null,
                email: user.email || null,
                department: user.department || null,
                designation: user.designation || null,
                salary: user.salary || null,
                role: user.role || null,
              },
          date: attendance.date || null,
          inTime: attendance.inTime || null,
          outTime: attendance.outTime || null,
          duration: attendance.duration || null,
          status: attendance.status || null,
        };
      })
    );

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "All users' attendance for today fetched successfully",
      date,
      totalUsers: result.length,
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to fetch all users' attendance for today",
      error: err.message,
    });
  }
};

// Get single user's full attendance history
export const getSingleUserFullAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Fetch Attendance Records
    const attendanceRecords = await AttendanceModel.find({ userId }).populate(
      "userId",
      "first_name last_name email status userId joining_date  department designation salary role"
    );

    // 2. Fetch Leave Records
    const leaveRecords = await LeaveModel.find({ userId }).populate(
      "Attendance"
    );

    console.log("attendanceRecords", attendanceRecords);

    res.status(200).json({
      success: true,
      message: "Attendance fetched successfully",
      data: {
        attendance: attendanceRecords,
        leaves: leaveRecords,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to fetch attendance",
      error: error.message,
    });
  }
};

// Get all users' full attendance history
export const getAllUsersFullAttendanceHistory = async (req, res) => {
  try {
    const records = await AttendanceModel.find();
    const users = await userModel.find({});

    const attendanceByUser = {};

    records.forEach((recordDoc) => {
      if (!recordDoc.userId) return;

      const user = users.find(
        (u) => u._id?.toString() === recordDoc.userId?.toString()
      );
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
          department: user.department,
          designation: user.designation,
          salary: user.salary,
          role: user.role,
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
      message: "Error fetching full attendance history",
      error: error.message,
    });
  }
};

export const getAllUsersAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { _id } = req.user;

    const user = await userModel.findById(_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const formattedStart = moment
      .tz(startDate, user.timeZone)
      .format("YYYY-MM-DD");
    const formattedEnd = moment.tz(endDate, user.timeZone).format("YYYY-MM-DD");

    const dateRange = [];
    let curr = moment.tz(startDate, user.timeZone).startOf("day");
    const last = moment.tz(endDate, user.timeZone).endOf("day");

    while (curr.isSameOrBefore(last, "day")) {
      dateRange.push(curr.format("YYYY-MM-DD"));
      curr.add(1, "day");
    }

    const records = await AttendanceModel.find({
      date: {
        $gte: formattedStart,
        $lte: formattedEnd,
      },
    }).populate("userId");

    const userMap = new Map();

    records.forEach((record) => {
      const recordUser = record.userId;
      if (!recordUser?._id) return;
      const userKey = recordUser._id.toString();

      if (!userMap.has(userKey)) {
        userMap.set(userKey, {
          userId: recordUser._id,
          name: `${recordUser.first_name} ${recordUser.last_name}`,
          email: recordUser.email,
          status: recordUser.status,
          attendance: {},
          presentCount: 0,
          absentCount: 0,
          halfDayCount: 0,
          outOfDays: 0,
        });
      }

      const formattedDate = moment(record.date).format("YYYY-MM-DD");
      const userData = userMap.get(userKey);
      userData.attendance[formattedDate] = record.status;

      if (record.status.toLowerCase() === "present") userData.presentCount++;
      if (record.status.toLowerCase() === "absent") userData.absentCount++;
      if (record.status.toLowerCase() === "half day") userData.halfDayCount++;
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Attendance Report");

    const columns = [
      { header: "User ID", key: "userId", width: 25 },
      { header: "Name", key: "name", width: 30 },
      { header: "Email", key: "email", width: 30 },
      { header: "Status", key: "status", width: 15 },
      ...dateRange.map((date) => ({ header: date, key: date, width: 15 })),
      { header: "Total Present", key: "totalPresent", width: 15 },
      { header: "Total Absent", key: "totalAbsent", width: 15 },
      { header: "Total Half Day", key: "totalHalfDay", width: 15 },
      { header: "Out of Days", key: "outOfDays", width: 15 },
    ];

    sheet.columns = columns;

    for (const [, user] of userMap.entries()) {
      const row = {
        userId: user.userId.toString(),
        name: user.name,
        email: user.email,
        status: user.status,
      };

      dateRange.forEach((date) => {
        const status = user.attendance[date];
        if (status) {
          row[date] = status;
        } else {
          row[date] = "Absent";
          user.absentCount++;
        }
      });

      row.totalPresent = user.presentCount;
      row.totalAbsent = user.absentCount;
      row.totalHalfDay = user.halfDayCount;
      row.outOfDays = dateRange.length;

      sheet.addRow(row);
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Attendance_Report_${startDate}_to_${endDate}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// export const migrateStringDatesToDateType = async (req, res) => {
//   try {
//     // Count records with string-type date
//     const beforeCount = await AttendanceModel.countDocuments({
//       date: { $type: "string" },
//     });

//     console.log("Before migration - String type date count:", beforeCount);

//     if (beforeCount === 0) {
//       return res.status(200).json({
//         success: true,
//         message: "No string-type date records found. Migration not needed.",
//       });
//     }

//     // Perform the migration
//     const result = await AttendanceModel.updateMany(
//       { date: { $type: "string" } },
//       [
//         {
//           $set: {
//             date: { $toDate: "$date" },
//           },
//         },
//       ]
//     );

//     // Count after migration
//     const afterCount = await AttendanceModel.countDocuments({
//       date: { $type: "date" },
//     });

//     console.log("After migration - Date type count:", afterCount);

//     res.status(200).json({
//       success: true,
//       message: "Migration completed successfully.",
//       stringDatesBefore: beforeCount,
//       properDatesAfter: afterCount,
//       modifiedCount: result.modifiedCount,
//     });
//   } catch (error) {
//     console.error("Migration Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Migration failed",
//       error: error.message,
//     });
//   }
// };
