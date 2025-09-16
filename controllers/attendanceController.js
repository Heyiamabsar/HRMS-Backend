import moment from "moment-timezone";
import AttendanceModel from "../models/attendanceModule.js";

import holidayModel from "../models/holidayModule.js";
import { formatAttendanceRecord } from "../utils/attendanceUtils.js";
import LeaveModel from "../models/leaveModel.js";
import ExcelJS from "exceljs";
import axios from "axios";
import path from "path";
import fs from "fs";
import { sendNotification } from "../utils/notificationutils.js";
import branchModel from "../models/branchModel.js";
import { getBranchHolidaysForUser } from "../utils/commonUtils.js";
import userModel from "../models/userModel.js";

// Punch IN
export const markInTime = async (req, res) => {
  try {
    const userId = req.user._id;
    const { location } = req.body;
    const latitude = location?.latitude;
    const longitude = location?.longitude;
    const user = await userModel.findById(userId).populate("branch", "_id branchName");
    // const userTimeZone = user.timeZone || "UTC";
    const userTimeZone = "UTC";

    const date = moment().tz(userTimeZone).format("YYYY-MM-DD");
    const currentDay = moment().tz(userTimeZone).format("dddd")
    const existing = await AttendanceModel.findOne({ userId, date });

    const branchWeekends = user.branch?.weekends || [];
    if (branchWeekends.includes(currentDay)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Today is a weekend (${currentDay}) for your branch.`,
      });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Location coordinates (latitude and longitude) are required.",
      });
    }
console.log("Using User-Agent:", process.env.NOMINATION_USER_AGENT);
    if (existing && existing.inTime) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Already punched in today",
      });
    }


    // const response = await axios.get(
    //   `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
    //   {
    //     headers: {
    //       "User-Agent": process.env.NOMINATION_USER_AGENT,
    //     },
    //   }
    // );
    
    const response = await axios.get(`${process.env.SERVER_URL}/proxy/reverse-geocode`, {
      params: { lat: latitude, lon: longitude },
    });


    console.log('response',response?.data)
    let address = response?.data?.address;
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
        link: `/attendance`,
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
          "location.checkIn": {
            latitude,
            longitude,
            address,
            displayName,
            punchedFrom,
          },
        },
      },
      { upsert: true, new: true }
    );

    console.log('attendanceStatus',attendanceStatus)
    await attendanceStatus.save();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Punched IN successfully",
      attendance: attendanceStatus,
      punchedFrom,
    });
  } catch (err) {
      res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to punch IN",
      error: err,
    });
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

    // const userTimeZone = req.user.timeZone || "UTC";
    const userTimeZone = "UTC";

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
          "location.checkOut": {
            latitude,
            longitude,
            address,
            displayName,
            punchedFrom,
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
      attendance: attendanceStatus,
      punchedFrom,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to punch OUT",
      error: err.message,
    });
  }
};

// Get today's attendance
export const getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user._id;
    const date = moment().format("YYYY-MM-DD");

    // ✅ Fetch user with branch
    const user = await userModel.findById(userId).populate("branch");
    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "User not found",
      });
    }

    if (!user.timeZone) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "User timezone not set. Please update user profile.",
      });
    }

    // const userTimeZone = user.timeZone;
    const userTimeZone = "UTC";

    const currentDay = moment().tz(userTimeZone).format("dddd");

    const branch = user.branch;
    console.log('branch',branch)
    if (!branch) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "User branch not found",
      });
    }

    if (!Array.isArray(branch.weekends) || branch.weekends.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Branch weekends not configured. Please update branch settings.",
      });
    }

    const branchId = branch._id;
    const branchWeekends = branch.weekends;
    const isWeekend = branchWeekends.includes(currentDay);

    // ✅ Check branch-specific holiday
    const holiday = await holidayModel.findOne({
      date,
      branch: branchId,
      isOptional: false,
    });

    let attendance = await AttendanceModel.findOne({ date, userId });

    // ✅ If today is a holiday
    if (holiday) {
      if (!attendance) {
        attendance = await AttendanceModel.create({
          userId,
          date,
          inTime: null,
          outTime: null,
          status: "Holiday",
        });
      }
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: `Today is a holiday for branch: ${branch.name}`,
        date,
        attendance,
        branch: {
          name: branch.name,
          weekends: branchWeekends,
        },
      });
    }

    // ✅ If no holiday → mark weekend or absent
    if (!attendance) {
      attendance = await AttendanceModel.create({
        userId,
        date,
        inTime: null,
        outTime: null,
        status: isWeekend ? "Weekend" : "Absent",
      });
    } else if (
      !attendance.inTime &&
      !attendance.outTime &&
      (attendance.status === "Absent" || !attendance.status)
    ) {
      attendance.status = isWeekend ? "Weekend" : "Absent";
      await attendance.save();
    }

    // ✅ Populate user details (NO save after populate)
    await attendance.populate(
      "userId",
      "first_name last_name email status department designation salary role"
    );

    // ✅ Final response
    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Today's attendance fetched successfully",
      date,
      attendance,
      branch: {
        name: branch.name,
        weekends: branchWeekends,
      },
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

// Get today's attendance
export const getSingleUserAttendanceByDate = async (req, res) => {
  try {
    const userId = req.user._id;
    const { date } = req.query; // Or req.body if you prefer POST
    const targetDate = date ? moment(date, "YYYY-MM-DD") : moment();
    const dateKey = targetDate.format("YYYY-MM-DD");

    // const date = req.params.date || moment().format("YYYY-MM-DD");


    // ✅ Fetch user with branch
    const user = await userModel.findById(userId).populate("branch", "_id branchName");
    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "User not found",
      });
    }

    if (!user.timeZone) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "User timezone not set. Please update user profile.",
      });
    }

    // const userTimeZone = user.timeZone;
    const userTimeZone = "UTC";

    const currentDay = moment().tz(userTimeZone).format("dddd");

    const branch = user.branch;
    if (!branch) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "User branch not found",
      });
    }

    if (!Array.isArray(branch.weekends) || branch.weekends.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Branch weekends not configured. Please update branch settings.",
      });
    }

    const branchId = branch._id;
    const branchWeekends = branch.weekends;
    const isWeekend = branchWeekends.includes(currentDay);

    // ✅ Check branch-specific holiday
    const holiday = await holidayModel.findOne({
      date: dateKey,
      branch: branchId,
      isOptional: false,
    });

    let attendance = await AttendanceModel.findOne({ date: dateKey, userId });

    // ✅ If today is a holiday
    if (holiday) {
      if (!attendance) {
        attendance = await AttendanceModel.create({
          userId,
          date: dateKey,
          inTime: null,
          outTime: null,
          status: "Holiday",
        });
      }
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: `Today is a holiday for branch: ${branch.name}`,
        date: dateKey,
        attendance,
        branch: {
          name: branch.name,
          weekends: branchWeekends,
        },
      });
    }

    // ✅ If no holiday → mark weekend or absent
    if (!attendance) {
      attendance = await AttendanceModel.create({
        userId,
        date: dateKey,
        inTime: null,
        outTime: null,
        status: isWeekend ? "Weekend" : "Absent",
      });
    } else if (
      !attendance.inTime &&
      !attendance.outTime &&
      (attendance.status === "Absent" || !attendance.status)
    ) {
      attendance.status = isWeekend ? "Weekend" : "Absent";
      await attendance.save();
    }

    // ✅ Populate user details (NO save after populate)
    await attendance.populate(
      "userId",
      "first_name last_name email status department designation salary role"
    );

    // ✅ Final response
    res.status(200).json({
      success: true,
      statusCode: 200,
      message:  `Attendance for ${dateKey} fetched successfully`,
      date: dateKey,
      attendance,
      branch: {
        name: branch.name,
        weekends: branchWeekends,
      },
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: `Failed to fetch today's attendance for ${dateKey}`,
      error: err.message,
    });
  }
};


// Get all users' attendance for today
export const getAllUsersTodayAttendance = async (req, res) => {
  try {
    const today = moment().startOf("day");
    const dateKey = today.format("YYYY-MM-DD");

    // ✅ Fetch all users (active only if needed)
    const users = await userModel.find()
      .populate({ path: "branch", select: "weekends timeZone" })
      .lean();

    // ✅ Fetch today's attendance for all users
    const attendanceRecords = await AttendanceModel.find({
      date: dateKey
    }).lean();

    // ✅ Fetch all leaves for today (approved only)
    const leaveRecords = await LeaveModel.find({
      date: dateKey,
      status: "Approved"
    }).lean();

    // ✅ Convert attendance and leaves to map
    const attendanceMap = {};
    attendanceRecords.forEach(att => {
      attendanceMap[att.userId.toString()] = att;
    });

    const leaveMap = {};
    leaveRecords.forEach(leave => {
      leaveMap[leave.userId.toString()] = leave;
    });

    const result = [];

    for (const user of users) {
      const userId = user._id.toString();
      // const userTimeZone = user?.branch?.timeZone || user?.timeZone || "UTC";
      const userTimeZone = "UTC";

      const branchWeekends = user?.branch?.weekends || [];
      const currentDay = moment().tz(userTimeZone).format("dddd");

      // ✅ Get branch-specific holidays
      const holidays = await getBranchHolidaysForUser(user);
      const holidayMap = {};
      holidays.forEach(h => {
        holidayMap[moment(h.date).format("YYYY-MM-DD")] = h;
      });

      let record = {
        user: {
          userId: user._id || null,
          firstName: user.first_name || null,
          lastName: user.last_name || null,
          email: user.email || null,
          department: user.department || null,
          designation: user.designation || null,
          salary: user.salary || null,
          role: user.role || null
        },
        date: dateKey,
        inTime: null,
        outTime: null,
        duration: null,
        status: "Absent"
      };

      const att = attendanceMap[userId];
      const leave = leaveMap[userId];
      const isHoliday = holidayMap[dateKey] ? true : false;
      const isWeekend = branchWeekends.includes(currentDay);

      if (att) {
        record.inTime = att.inTime;
        record.outTime = att.outTime;
        record.duration = att.duration;
        record.status = att.status || "Present";

        if (isHoliday && att.inTime && att.outTime) {
          record.status = "Over Time";
        } else if (isHoliday) {
          record.status = "Holiday";
        }
      } else if (leave) {
        record.status = "Leave";
      } else if (isHoliday) {
        record.status = "Holiday";
      } else if (isWeekend) {
        record.status = "Weekend";
      }

      result.push(record);
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "All users' attendance for today fetched successfully",
      date: dateKey,
      totalUsers: result.length,
      data: result
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to fetch all users' attendance for today",
      error: err.message
    });
  }
};

// Get all users' attendance by date 
export const getAllUsersAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.query; // Or req.body if you prefer POST
    const targetDate = date ? moment(date, "YYYY-MM-DD") : moment();
    const dateKey = targetDate.format("YYYY-MM-DD");

    // ✅ Fetch all users (active only if needed)
    const users = await userModel.find()
      .populate({ path: "branch", select: "weekends timeZone" })
      .lean();

    // ✅ Fetch today's attendance for all users
    const attendanceRecords = await AttendanceModel.find({
      date: dateKey
    }).lean();

    // ✅ Fetch all leaves for today (approved only)
    const leaveRecords = await LeaveModel.find({
      date: dateKey,
      status: "Approved"
    }).lean();

    // ✅ Convert attendance and leaves to map
    const attendanceMap = {};
    attendanceRecords.forEach(att => {
      attendanceMap[att.userId.toString()] = att;
    });

    const leaveMap = {};
    leaveRecords.forEach(leave => {
      leaveMap[leave.userId.toString()] = leave;
    });

    const result = [];

    for (const user of users) {
      const userId = user._id.toString();
      // const userTimeZone = user?.branch?.timeZone || user?.timeZone || "UTC";
      const userTimeZone = "UTC";
      const branchWeekends = user?.branch?.weekends || [];
      const currentDay = moment().tz(userTimeZone).format("dddd");

      // ✅ Get branch-specific holidays
      const holidays = await getBranchHolidaysForUser(user);
      const holidayMap = {};
      holidays.forEach(h => {
        holidayMap[moment(h.date).format("YYYY-MM-DD")] = h;
      });

      let record = {
        user: {
          userId: user._id || null,
          firstName: user.first_name || null,
          lastName: user.last_name || null,
          email: user.email || null,
          department: user.department || null,
          designation: user.designation || null,
          salary: user.salary || null,
          role: user.role || null
        },
        date: dateKey,
        inTime: null,
        outTime: null,
        duration: null,
        status: "Absent"
      };

      const att = attendanceMap[userId];
      const leave = leaveMap[userId];
      const isHoliday = holidayMap[dateKey] ? true : false;
      const isWeekend = branchWeekends.includes(currentDay);

      if (att) {
        record.inTime = att.inTime;
        record.outTime = att.outTime;
        record.duration = att.duration;
        record.status = att.status || "Present";

        if (isHoliday && att.inTime && att.outTime) {
          record.status = "Over Time";
        } else if (isHoliday) {
          record.status = "Holiday";
        }
      } else if (leave) {
        record.status = "Leave";
      } else if (isHoliday) {
        record.status = "Holiday";
      } else if (isWeekend) {
        record.status = "Weekend";
      }

      result.push(record);
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `All users' attendance for ${dateKey} fetched successfully`,
      date: dateKey,
      totalUsers: result.length,
      data: result
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: `Failed to fetch all users' attendance for ${dateKey}`,
      error: err.message
    });
  }
};


export const getLoginUserFullAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await userModel.findById(userId).populate("branch", "_id branchName");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // const userTimeZone = user.timeZone || "UTC";
    const userTimeZone = "UTC";

    const branchId = user.branch || null;
    if (!branchId) {
      return res.status(400).json({ success: false, message: "User branch not found" });
    }
    const branch = await branchModel.findById(branchId);
    if (!branch) {
      return res.status(400).json({ success: false, message: "Branch not found" });
    } 

    if (!Array.isArray(branch.weekends) || branch.weekends.length === 0) {
      return res.status(400).json({ success: false, message: "Branch weekends not configured. Please update branch settings." });
    } 
    const branchWeekends = branch?.weekends || [];
    const joiningDate = moment(user.joining_date).startOf("day");
    const today = moment().tz(userTimeZone).startOf("day");

    // ✅ Fetch Attendance, Holidays (filtered by branch), and Leaves
    const attendanceRecords = await AttendanceModel.find({ userId }).lean();

    // const holidays = await holidayModel.find({ branch: branch._id,isOptional: false, }).sort({ date: 1 });
    // const holidayRecords = await holidayModel.find({
    //   isOptional: false,
    //   branch: branch._id
    // }).lean();
    const holidayRecords = await getBranchHolidaysForUser(user);
    const leaveRecords = await LeaveModel.find({ userId, status: "Approved" }).lean();

    // ✅ Convert arrays to maps for quick lookup
    const attendanceMap = {};
    attendanceRecords.forEach(att => {
      attendanceMap[moment(att.date).format("YYYY-MM-DD")] = att;
    });

    const holidayMap = {};
    holidayRecords.forEach(holiday => {
      holidayMap[moment(holiday.date).format("YYYY-MM-DD")] = holiday;
    });

    const leaveMap = {};
    leaveRecords.forEach(leave => {
      const leaveDate = moment(leave.date).format("YYYY-MM-DD");
      leaveMap[leaveDate] = leave;
    });

    // ✅ Build full history
    const fullHistory = [];
    let current = joiningDate.clone();

    while (current.isSameOrBefore(today)) {
      const dateKey = current.format("YYYY-MM-DD");
      const currentDay = current.format("dddd");

      let record = {
        date: dateKey,
        status: "Absent",
        inTime: null,
        outTime: null,
        duration: null,
        leaveType: null
      };

      if (attendanceMap[dateKey]) {
        record = { ...record, ...attendanceMap[dateKey] };

        // ✅ If it's also a holiday for branch → mark as Over Time if inTime & outTime exist
        if (holidayMap[dateKey]) {
          if (record.inTime && record.outTime) {
            record.status = "Over Time";
          } else {
            record.status = "Holiday";
          }
        }
      } else if (leaveMap[dateKey]) {
        record.status = "Leave";
        record.leaveType = leaveMap[dateKey].leaveType;
      } else if (holidayMap[dateKey]) {
        record.status = "Holiday";
      } else if (branchWeekends.includes(currentDay)) {
        record.status = "Weekend";
      }

      fullHistory.push(record);
      current.add(1, "day");
    }

    res.status(200).json({
      success: true,
      message: "Full Attendance History fetched successfully",
      data: fullHistory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to fetch attendance",
      error: error.message
    });
  }
};


export const getSingleUserFullAttendanceHistory = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await userModel.findById(userId).populate("branch", "_id branchName");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // const userTimeZone = user.timeZone || "UTC";
    const userTimeZone = "UTC";

    const branchWeekends = user.branch?.weekends || [];
    const joiningDate = moment(user.joining_date).startOf("day");
    const today = moment().tz(userTimeZone).startOf("day");

    // ✅ Fetch Attendance, Holidays (filtered by branch), and Leaves
    const attendanceRecords = await AttendanceModel.find({ userId }).lean();

    // const holidays = await holidayModel.find({ branch: branch._id,isOptional: false, }).sort({ date: 1 });
    // const holidayRecords = await holidayModel.find({
    //   isOptional: false,
    //   branch: branch._id
    // }).lean();
    const holidayRecords = await getBranchHolidaysForUser(user);
    const leaveRecords = await LeaveModel.find({ userId, status: "Approved" }).lean();

    // ✅ Convert arrays to maps for quick lookup
    const attendanceMap = {};
    attendanceRecords.forEach(att => {
      attendanceMap[moment(att.date).format("YYYY-MM-DD")] = att;
    });

    const holidayMap = {};
    holidayRecords.forEach(holiday => {
      holidayMap[moment(holiday.date).format("YYYY-MM-DD")] = holiday;
    });

    const leaveMap = {};
    leaveRecords.forEach(leave => {
      const leaveDate = moment(leave.date).format("YYYY-MM-DD");
      leaveMap[leaveDate] = leave;
    });

    // ✅ Build full history
    const fullHistory = [];
    let current = joiningDate.clone();

    while (current.isSameOrBefore(today)) {
      const dateKey = current.format("YYYY-MM-DD");
      const currentDay = current.format("dddd");

      let record = {
        date: dateKey,
        status: "Absent",
        inTime: null,
        outTime: null,
        duration: null,
        leaveType: null
      };

      if (attendanceMap[dateKey]) {
        record = { ...record, ...attendanceMap[dateKey] };

        // ✅ If it's also a holiday for branch → mark as Over Time if inTime & outTime exist
        if (holidayMap[dateKey]) {
          if (record.inTime && record.outTime) {
            record.status = "Over Time";
          } else {
            record.status = "Holiday";
          }
        }
      } else if (leaveMap[dateKey]) {
        record.status = "Leave";
        record.leaveType = leaveMap[dateKey].leaveType;
      } else if (holidayMap[dateKey]) {
        record.status = "Holiday";
      } else if (branchWeekends.includes(currentDay)) {
        record.status = "Weekend";
      }

      fullHistory.push(record);
      current.add(1, "day");
    }

    res.status(200).json({
      success: true,
      message: "Full Attendance History fetched successfully",
      data: fullHistory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to fetch attendance",
      error: error.message
    });
  }
};


export const getAllUsersFullAttendanceHistory = async (req, res) => {
  try {
    const users = await userModel.find()
      .populate({ path: "branch", select: "weekends" })
      .lean();

    const today = moment().startOf("day");

    const result = [];

    for (const user of users) {
      const userId = user._id.toString();
      // const userTimeZone = user.timeZone || "UTC";
      const userTimeZone = "UTC";

      const branchWeekends = user.branch?.weekends || [];
      const joiningDate = moment(user.joining_date).startOf("day");

      // ✅ Fetch all data for this user in bulk
      const [attendanceRecords, leaveRecords, holidayRecords] = await Promise.all([
        AttendanceModel.find({ userId }).lean(),
        LeaveModel.find({ userId, status: "Approved" }).lean(),
        getBranchHolidaysForUser(user)
      ]);

      // ✅ Convert arrays to maps for O(1) lookup
      const attendanceMap = {};
      attendanceRecords.forEach(att => {
        attendanceMap[moment(att.date).format("YYYY-MM-DD")] = att;
      });

      const holidayMap = {};
      holidayRecords.forEach(h => {
        holidayMap[moment(h.date).format("YYYY-MM-DD")] = h;
      });

      const leaveMap = {};
      leaveRecords.forEach(leave => {
        leaveMap[moment(leave.date).format("YYYY-MM-DD")] = leave;
      });

      // ✅ Build attendance history for this user
      let attendanceCount = 0;
      let current = joiningDate.clone();

   while (current.isSameOrBefore(today)) {
        attendanceCount++;
        current.add(1, "day");
      }

      // ✅ Push final user object
      result.push({
        userId,
        empId: user.userId,
        userName: `${user.first_name} ${user.last_name}`,
        userEmail: user.email,
        userPhone: user.phone,
        joining_date: user.joining_date,
        department: user.department,
        designation: user.designation,
        salary: user.salary,
        role: user.role,
        attendanceDays: attendanceCount
      });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "All users' full attendance history fetched successfully",
      data: result
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching full attendance history",
      error: error.message
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
    }).populate({
        path: "userId",
        select: "first_name last_name email status timeZone branch",
        populate: {
          path: "branch",
          select: "weekends",
        },
      });

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
          timeZone: recordUser.timeZone || "UTC",
          weekends: recordUser.branch?.weekends || ["Sunday"],
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
        if (user.attendance[date]) {
          row[date] = user.attendance[date];
        } else {
          const dayName = moment.tz(date, user.timeZone).format("dddd");
          const isWeekend = user.weekends.includes(dayName);
          if (isWeekend) {
            row[date] = "Weekend";
          } else {
            row[date] = "Absent";
            user.absentCount++;
          }
        }
        // if (status) {
        //   row[date] = status;
        // } else {
        //   row[date] = "Absent";
        //   user.absentCount++;
        // }
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


// Get all users' full attendance history
// export const getAllUsersFullAttendanceHistory = async (req, res) => {
//   try {
//     const records = await AttendanceModel.find().populate(
//       "userId",
//       "first_name last_name email phone joining_date department designation salary role userId"
//     );;
//     const users = await userModel.find({});

//     const attendanceByUser = {};

//     records.forEach((recordDoc) => {
//       const isWeekend = moment(recordDoc.date).day() === 0;
//       if (
//         !recordDoc.inTime &&
//         !recordDoc.outTime &&
//         (recordDoc.status === "Absent" || !recordDoc.status)
//       ) {
//         recordDoc.status = isWeekend ? "Weekend" : "Absent";
//         recordDoc.save(); // No need to await inside forEach
//       }
//       if (!recordDoc.userId) return;

//       const user = users.find(
//         (u) => u._id?.toString() === recordDoc.userId?.toString()
//       );
//       if (!user) return;

//       const record = recordDoc.toObject();
//       const userIdStr = user._id.toString();

//       if (!attendanceByUser[userIdStr]) {
//         attendanceByUser[userIdStr] = {
//           userId: userIdStr,
//           empId: user?.userId,
//           userName: `${user.first_name} ${user.last_name}`,
//           userEmail: user.email,
//           userPhone: user.phone,
//           joining_date: user.joining_date,
//           department: user.department,
//           designation: user.designation,
//           salary: user.salary,
//           role: user.role,
//           attendanceHistory: [],
//         };
//       }

//       attendanceByUser[userIdStr].attendanceHistory.push(record);
//     });

//     res.status(200).json({
//       success: true,
//       statusCode: 200,
//       message: "All users' attendance history fetched successfully",
//       data: Object.values(attendanceByUser), // Convert to array if needed
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       statusCode: 500,
//       message: "Error fetching full attendance history",
//       error: error.message,
//     });
//   }
// };



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


export const backFillAttendance = async (req, res) => {
  try {
    const { userId, fromDate, toDate } = req.body;

    if (!userId || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "userId, fromDate and toDate are required",
      });
    }

    const start = moment(fromDate, "YYYY-MM-DD");
    const end = moment(toDate, "YYYY-MM-DD");

    if (!start.isValid() || !end.isValid() || start.isAfter(end)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range",
      });
    }

    const staticLocation = {
      latitude: 19.1872137,
      longitude: 77.3169113,
      address: {
        city: "Mumbai",
        county: "Mumbai",
        state_district: "Mumbai",
        state: "Maharashtra",
        postcode: "431600",
        country: "India",
        country_code: "in"
      },
      displayName: "Mumbai, Maharashtra, 431600, India",
      punchedFrom: "Web"
    }

    const attendanceRecords = [];
    let skipped = 0;

    let current = start.clone();
    while (current.isSameOrBefore(end)) {
      const day = current.format("dddd");
      const date = current.format("YYYY-MM-DD");

      if (day !== "Sunday") {
        const exists = await AttendanceModel.findOne({ userId, date });
        if (exists) {
          skipped++;
        } else {
          // Random Check-In between 8:30 AM - 9:00 AM
          const checkInMinute = 30 + Math.floor(Math.random() * 31);
          const inTime = moment(`${date} 08:${checkInMinute}`, "YYYY-MM-DD HH:mm").toDate();

          // Random Check-Out between 6:20 PM - 6:40 PM
          const checkOutMinute = 20 + Math.floor(Math.random() * 21);
          const outTime = moment(`${date} 18:${checkOutMinute}`, "YYYY-MM-DD HH:mm").toDate();

          attendanceRecords.push({
            userId,
            date,
            inTime,
            outTime,
            status: "Present",
            duration: moment.utc(outTime - inTime).format("HH:mm:ss"),
            location: {
              checkIn: staticLocation,
              checkOut: staticLocation
            }
          });
        }
      }
      current.add(1, "day");
    }

    if (attendanceRecords.length > 0) {
      await AttendanceModel.insertMany(attendanceRecords);
    }

    res.status(201).json({
      success: true,
      message: "Attendance backfill completed successfully",
      totalInserted: attendanceRecords.length,
      skipped,
      data: attendanceRecords
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};