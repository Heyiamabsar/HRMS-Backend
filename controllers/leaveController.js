import AttendanceModel from "../models/attendanceModule.js";
import LeaveModel from "../models/leaveModel.js";
import userModel from "../models/userModel.js";
import mongoose from "mongoose";
import ExcelJS from "exceljs";

import moment from "moment-timezone";
import { sendNotification } from "../utils/notificationutils.js";
import { calculateLeaveBalance } from "../utils/commonUtils.js";

export const applyLeave = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;
    const userId = req.user?._id;
    const user = await userModel.findById(userId);

    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    let leaveBalance = await calculateLeaveBalance(userId);
    const sickLeaveCount = await LeaveModel.countDocuments({
      employee: userId,
      status: "approved",
      leaveType: "sick",
    });

    const unpaidLeaveCount = await LeaveModel.countDocuments({
      employee: userId,
      status: "approved",
      leaveType: "unpaid",
    });

    const leaveDays =
      Math.ceil(
        (new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)
      ) + 1;


    const isCasualOrVacation = ["casual", "vacation"].includes(leaveType);
    const isHalfDay = ["firstHalf", "secondHalf"].includes(leaveType);
    const deduction = isHalfDay ? 0.5 : leaveDays;

    if ((isCasualOrVacation || isHalfDay) && leaveBalance < deduction) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Insufficient leave balance",
      });
    }
    const overlappingLeave = await LeaveModel.findOne({
      employee: userId,
      status: "approved",
      fromDate: { $lte: end },
      toDate: { $gte: start },
    });


    if (overlappingLeave) {
      return res.status(400).json({
        success: false,
        message: "Leave already approved in the selected date range",
      });
    }

    const leave = await LeaveModel.create({
      employee: userId,
      userId,
      leaveType,
      fromDate,
      toDate,
      reason,
      sickLeave: sickLeaveCount,
      unPaidLeave: unpaidLeaveCount,
      leaveBalance,
      leaveTaken: deduction,
      maximumLeave: 14,
      status: "pending",
    });


    await sendNotification({
      forRoles: ["admin", "hr"],
      title: "New Leave Request",
      message: `${user.first_name} ${user.last_name}  requested leave from ${leave.fromDate} to ${leave.toDate}`,
      link: `/leave`,
      type: "user",
      performedBy: user._id,
    });
    await sendNotification({
      userId: user._id,
      title: "Leave Request Submitted",
      message: `Your leave request from ${leave.fromDate} to ${leave.toDate} has been submitted.`,
      link: `/leavestatus`,
      type: "user",
    });


    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Leave applied successfully",
      leave,
    });
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: "Failed to apply leave",
      error: error.message,
    });
  }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const { status, fromDate, toDate } = req.body;
    const userId = req.user._id;
    const loginUser = await userModel.findById(userId);

    if (!["approved", "rejected", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid status",
      });
    }

    const leave = await LeaveModel.findById(leaveId);
    if (!leave) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Leave not found",
      });
    }

    const user = await userModel.findById(leave.employee);
    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "User not found",
      });
    }


    let leaveBalance = await calculateLeaveBalance(userId);


    if (
      ["casual", "vacation", "firstHalf", "secondHalf"].includes(leave.leaveType)
    ) {
      const isHalfDay = ["firstHalf", "secondHalf"].includes(leave.leaveType);
      const deduction = isHalfDay ? 0.5 : leave.leaveTaken;

      if ((["casual", "vacation"].includes(leave.leaveType) || isHalfDay) && leaveBalance < deduction) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Insufficient leave balance for this leave type",
        });
      }

      if (["casual", "vacation"].includes(leave.leaveType)) {
        leave.leaveBalance = leaveBalance - deduction;
      }
    }

    // APPROVE CASE
    if (status === "approved" && leave.status !== "approved") {

        const today = new Date();
          today.setHours(0, 0, 0, 0); // normalize today
          if (leave.toDate < today) {
            return res.status(400).json({
              success: false,
              statusCode: 400,
              message: "Cannot approve a leave for past dates",
            });
          }

      if (["casual", "vacation"].includes(leave.leaveType)) {
        leave.leaveBalance = leaveBalance - leave.leaveTaken;
      }

      const dates = [];
      for (
        let date = moment(fromDate);
        date.isSameOrBefore(toDate);
        date.add(1, "days")
      ) {
        dates.push(date.format("YYYY-MM-DD"));
      }

      let operations;
      if (leave.leaveType === "firstHalf" || leave.leaveType === "secondHalf") {
        const leaveLabel =
          leave.leaveType === "firstHalf"
            ? "First Half Leave"
            : "Second Half Leave";

        operations = dates.map((date) => ({
          updateOne: {
            filter: { date, userId: leave.employee },
            update: { $set: { status: leaveLabel } },
            upsert: true,
          },
        }));

        // Deduct 0.5 leave from balance
        leave.leaveTaken = 0.5;
        leave.leaveBalance = leaveBalance - 0.5;

        if (["sick"].includes(leave.leaveType)) {
          user.sickLeaves = (user.sickLeaves || 0) + 0.5;
          leave.sickLeave = user.sickLeaves;
        } else if (["LOP", "unpaid"].includes(leave.leaveType)) {
          user.unpaidLeaves = (user.unpaidLeaves || 0) + 0.5;
          leave.unPaidLeave = user.unpaidLeaves;
        }
      } else {
        operations = dates.map((date) => ({
          updateOne: {
            filter: { date, userId: leave.employee },
            update: { $set: { status: "Leave" } },
            upsert: true,
          },
        }));

        if (["casual", "vacation"].includes(leave.leaveType)) {
          leave.leaveBalance = leaveBalance - leave.leaveTaken;
        } else if (leave.leaveType === "sick") {
          user.sickLeaves = (user.sickLeaves || 0) + leave.leaveTaken;
          leave.sickLeave = user.sickLeaves;
        } else if (["LOP", "unpaid"].includes(leave.leaveType)) {
          user.unpaidLeaves = (user.unpaidLeaves || 0) + leave.leaveTaken;
          leave.unPaidLeave = user.unpaidLeaves;
        }
      }

      await AttendanceModel.bulkWrite(operations);

      leave.sickLeave = user.sickLeaves;
      leave.unPaidLeave = user.unpaidLeaves;
    }

    // CANCEL CASE
    if (leave.status === "approved" && status === "cancelled") {


      const dates = [];
      for (
        let date = moment(fromDate);
        date.isSameOrBefore(toDate);
        date.add(1, "days")
      ) {
        dates.push(date.format("YYYY-MM-DD"));
      }

      const isHalfDay =
        leave.leaveType === "firstHalf" || leave.leaveType === "secondHalf";

      await Promise.all(
        dates.map((date) =>
          AttendanceModel.updateOne(
            {
              date,
              userId: leave.employee,
              status: isHalfDay
                ? { $in: ["First Half Leave", "Second Half Leave"] }
                : "Leave",
            },
            { $set: { status: "" } }
          )
        )
      );

      const deduction = isHalfDay ? 0.5 : leave.leaveTaken;

      if (["casual", "vacation"].includes(leave.leaveType)) {
        leave.leaveBalance += deduction;
      } else if (leave.leaveType === "sick") {
        user.sickLeaves = (user.sickLeaves || 0) - deduction;
        leave.sickLeave = user.sickLeaves;
      } else if (["LOP", "unpaid"].includes(leave.leaveType)) {
        user.unpaidLeaves = (user.unpaidLeaves || 0) - deduction;
        leave.unPaidLeave = user.unpaidLeaves;
      }

      leave.sickLeave = user.sickLeaves;
      leave.unPaidLeave = user.unpaidLeaves;
    }


    leave.status = status;
    await user.save();
    await leave.save();

    await sendNotification({
      userId: leave.employee,
      title: `Your Leave Status Updated`,
      message: `Your leave from ${leave.fromDate} to ${leave.toDate} has been ${status} by ${loginUser.first_name} ${loginUser.last_name}`,
      link: `/leavestatus`,
      type: "admin",
      performedBy: req.user._id,
    });
    await sendNotification({
      forRoles: ["admin", "hr"],
      title: `${loginUser.first_name} ${loginUser.last_name}'s Leave Status Updated`,
      message: `Leave from ${leave.fromDate} to ${leave.toDate} has been ${status} by ${loginUser.first_name} ${loginUser.last_name}`,
      link: `/leave`,
      type: "admin",
      performedBy: req.user._id,
    });


    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Leave ${status} successfully`,
      sickLeave: leave.sickLeave,
      unPaidLeave: leave.unPaidLeave,
      leave,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to update leave status",
      error: error.message,
    });
  }
};

export const cancelLeaveByUser = async (req, res) => {
  try {
    const leaveId = req.params.leaveId;
    const userId = req.user._id;

    // Get leave
    const leave = await LeaveModel.findById(leaveId);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    // Check if leave belongs to this user
    if (leave.employee.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can cancel only your own leaves",
      });
    }

    // Leave already started?
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Deadline = fromDate - 1 day
    const cancelDeadline = new Date(leave.fromDate);
    cancelDeadline.setDate(cancelDeadline.getDate() - 1);
    cancelDeadline.setHours(23, 59, 59, 999);

    if (today > cancelDeadline) {
      return res.status(400).json({
        success: false,
        message: "You can cancel leave only till one day before it starts",
      });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isHalfDay =
      leave.leaveType === "firstHalf" || leave.leaveType === "secondHalf";

    // ✅ Attendance reset karna
    const dates = [];
    for (
      let date = moment(leave.fromDate);
      date.isSameOrBefore(leave.toDate);
      date.add(1, "days")
    ) {
      dates.push(date.format("YYYY-MM-DD"));
    }

    await Promise.all(
      dates.map((date) =>
        AttendanceModel.updateOne(
          {
            date,
            userId: leave.employee,
            status: isHalfDay
              ? { $in: ["First Half Leave", "Second Half Leave"] }
              : "Leave",
          },
          { $set: { status: "" } }
        )
      )
    );

    // ✅ Balance reversal
    if (["casual", "vacation", "firstHalf", "secondHalf"].includes(leave.leaveType)) {
      const updatedBalance = await calculateLeaveBalance(userId);
      user.leaveBalance = updatedBalance;
      leave.leaveBalance = updatedBalance;
    } else if (leave.leaveType === "sick") {
      user.sickLeaves = Math.max(0, (user.sickLeaves || 0) - (isHalfDay ? 0.5 : leave.leaveTaken));
      leave.sickLeave = user.sickLeaves;
    } else if (["LOP", "unpaid"].includes(leave.leaveType)) {
      user.unpaidLeaves = Math.max(0, (user.unpaidLeaves || 0) - (isHalfDay ? 0.5 : leave.leaveTaken));
      leave.unPaidLeave = user.unpaidLeaves;
    }

    // ✅ Update status
    leave.status = "cancelled by user";

    await user.save();
    await leave.save();

    await sendNotification({
      forRoles: ["admin", "hr"],
      title: "Leave Cancelled",
      message: `${user.first_name} ${user.last_name} cancelled their leave from ${leave.fromDate} to ${leave.toDate}`,
      link: `/leave`,
      type: "user",
      performedBy: user._id,
    });

    res.status(200).json({
      success: true,
      message: "Leave cancelled successfully",
      data: leave,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to cancel leave",
      error: error.message,
    });
  }
};


export const getAllLeavesStatus = async (req, res) => {
  try {
    const leaves = await LeaveModel.find()
      .populate({
        path: "employee",
        select: "first_name last_name email",
        match: { isDeleted: false },
      })
      .sort({ createdAt: -1 })
      .lean();

    const filteredLeaves = leaves.filter((leave) => leave.employee !== null);

    if (!filteredLeaves || filteredLeaves.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No leaves found for active users.",
      });
    }

    if (!leaves || leaves.length === 0) {
      return res
        .status(404)
        .json({ success: false, statusCode: 404, message: "No leaves found." });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Leaves fetched successfully.",
      count: filteredLeaves.length,
      data: filteredLeaves,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error. Failed to fetch leaves.",
      error: error.message,
    });
  }
};

export const getLeavesByUserId = async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, statusCode: 400, message: "Invalid user ID." });
    }

    const leaves = await LeaveModel.find({ employee: userId })
      .populate("employee", "first_name last_name email")
      .sort({ createdAt: -1 });

    if (!leaves || leaves.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No leaves found for this user.",
      });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      count: leaves.length,
      message: "Leaves fetched successfully.",
      data: leaves,
    });
  } catch (error) {
    console.error("Error in getLeavesByUserId:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error. Failed to fetch leaves by user ID.",
      error: error.message,
    });
  }
};

export const getLoginUserAllLeaves = async (req, res) => {
  try {
    if (!req.user || !req.user?._id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "User not authenticated",
      });
    }
    const userId = req.user._id;
    const totalLeavesAllowed = 14;
    const leaves = await LeaveModel.find({ employee: userId }).lean();

    const usedLeaves = leaves
      .filter((leave) => leave.status === "approved")
      .reduce((acc, leave) => acc + leave.leaveTaken, 0);
    const leaveBalance = totalLeavesAllowed - usedLeaves;

    const updatedLeaves = leaves.map((leave) => ({
      ...leave,
      leaveBalance,
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message:
        leaves.length > 0
          ? "Leaves fetched successfully."
          : "No leaves found for this user.",
      count: leaves.length,
      leaveBalance,
      data: updatedLeaves,
    });
  } catch (error) {
    console.error("Error in getLoginUserAllLeaves:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error. Failed to fetch user's leaves.",
      error: error.message,
    });
  }
};

export const getAllUsersLeaveReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { _id } = req.user;

    const user = await userModel.findById(_id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Start date and end date are required",
        });
    }

    const formattedStart = moment
      .tz(startDate, user.timeZone)
      .startOf("day")
      .toDate();
    const formattedEnd = moment
      .tz(endDate, user.timeZone)
      .endOf("day")
      .toDate();

    const leaves = await LeaveModel.find({
      fromDate: { $lte: formattedEnd },
      toDate: { $gte: formattedStart },
    }).populate("userId");

    const leaveMap = new Map();

    leaves.forEach((leave) => {
      const recordUser = leave.userId;
      if (!recordUser?._id) return;

      const userKey = recordUser._id.toString();

      if (!leaveMap.has(userKey)) {
        leaveMap.set(userKey, {
          // userId: recordUser._id,
          name: `${recordUser.first_name} ${recordUser.last_name}`,
          email: recordUser.email,
          status: recordUser.status,
          sickLeave: 0,
          unPaidLeave: 0,
          leaveBalance: leave.leaveBalance || 0,
          leaves: [],
        });
      }

      const totalDays =
        moment(leave.toDate).diff(moment(leave.fromDate), "days") + 1;

      // Aggregate leave counts
      leaveMap.get(userKey).sickLeave += leave.sickLeave || 0;
      leaveMap.get(userKey).unPaidLeave += leave.unPaidLeave || 0;

      leaveMap.get(userKey).leaves.push({
        reason: leave.reason,
        fromDate: moment(leave.fromDate).format("YYYY-MM-DD"),
        toDate: moment(leave.toDate).format("YYYY-MM-DD"),
        leaveType: leave.leaveType,
        status: leave.status,
        appliedAt: moment(leave.appliedAt).format("YYYY-MM-DD"),
        totalDays,
      });
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Leave Report");

    sheet.columns = [
      // { header: 'User ID', key: 'userId', width: 25 },
      { header: "Name", key: "name", width: 30 },
      { header: "Email", key: "email", width: 30 },
      { header: "Status", key: "status", width: 15 },
      { header: "Leave Type", key: "leaveType", width: 15 },
      { header: "Reason", key: "reason", width: 30 },
      { header: "From Date", key: "fromDate", width: 15 },
      { header: "To Date", key: "toDate", width: 15 },
      { header: "Total Days", key: "totalDays", width: 15 },
      { header: "Leave Status", key: "leaveStatus", width: 15 },
      { header: "Applied At", key: "appliedAt", width: 20 },
      { header: "Sick Leave Taken", key: "sickLeave", width: 15 },
      { header: "Unpaid Leave Taken", key: "unPaidLeave", width: 15 },
      { header: "Leave Balance", key: "leaveBalance", width: 15 },
    ];

    for (const [, user] of leaveMap.entries()) {
      user.leaves.forEach((lv) => {
        sheet.addRow({
          // userId: user.userId.toString(),
          name: user.name,
          email: user.email,
          status: user.status,
          leaveType: lv.leaveType,
          reason: lv.reason,
          fromDate: lv.fromDate,
          toDate: lv.toDate,
          totalDays: lv.totalDays,
          leaveStatus: lv.status,
          appliedAt: lv.appliedAt,
          sickLeave: user.sickLeave,
          unPaidLeave: user.unPaidLeave,
          leaveBalance: user.leaveBalance,
        });
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Leave_Report_${startDate}_to_${endDate}.xlsx`
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
