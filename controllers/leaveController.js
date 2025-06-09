import AttendanceModel from "../models/attendanceModule.js";
import LeaveModel from "../models/leaveModel.js";
import userModel from "../models/userModel.js";
import mongoose from "mongoose";
import moment from "moment-timezone";

export const applyLeave = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;
    console.log("Request body", req.body);

    const leaveDays =
      Math.ceil(
        (new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)
      ) + 1;
    console.log("leaves Days", leaveDays);
    const leave = await LeaveModel.create({
      employee: req.user?._id,
      userId: req.user?._id,
      leaveType,
      fromDate,
      toDate,
      reason,
      leaveTaken: leaveDays,
      maximumLeave: 14,
      status: "pending", // default status
    });

    console.log("leave", leave);

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

    console.log("Request Body updateApi", req.body);
    console.log("leaveId", leaveId);

    if (!["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, statusCode: 400, message: "Invalid status" });
    }

    const leave = await LeaveModel.findById(leaveId);
    console.log("leave update Api", leave);
    if (!leave) {
      return res
        .status(404)
        .json({ success: false, statusCode: 404, message: "Leave not found" });
    }

    if (status === "approved") {
      // Get all approved leaves of the employee
      const existingLeaves = await LeaveModel.find({
        employee: leave.employee,
        status: "approved",
      });
      console.log("existingLeaves", existingLeaves);

      const totalLeaveTaken = existingLeaves.reduce(
        (acc, leave) => acc + leave.leaveTaken,
        0
      );
      const leaveBalance = 14 - totalLeaveTaken;

      console.log("totalLeaveTaken", totalLeaveTaken);
      console.log("leaveBalance", leaveBalance);

      if (leaveBalance < leave.leaveTaken) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Insufficient leave balance",
        });
      }

      const dates = [];
      console.log("dates before", dates);
      for (
        let date = moment(fromDate);
        date.isSameOrBefore(toDate);
        date.add(1, "days")
      ) {
        dates.push(date.format("YYYY-MM-DD"));
      }
      console.log("dates After", dates);

      const operations = dates.map((date) => ({
        updateOne: {
          filter: { date, userId: leave.employee },
          update: { $set: { status: "Leave" } },
          upsert: true,
        },
      }));

      await AttendanceModel.bulkWrite(operations);
      if (status === "approved" && leave.status !== "approved") {
        let user = await userModel.findById(leave.employee);

        if (leave.leaveType === "casual" || leave.leaveType === "vacation") {
          leave.leaveBalance = leaveBalance - leave.leaveTaken;
        } else if (leave.leaveType === "sick") {
          user.sickLeaves = (user.sickLeaves || 0) + leave.leaveTaken;
        } else if (leave.leaveType === "LOP" || leave.leaveType === "unpaid") {
          user.unpaidLeaves = (user.unpaidLeaves || 0) + leave.leaveTaken;
        }

        leave.sickLeave = user.sickLeaves;
        leave.unPaidLeave = user.unpaidLeaves;

        await user.save();
      }

    }
    leave.status = status;
    await leave.save();

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

export const getAllLeavesStatus = async (req, res) => {
  try {
    const leaves = await LeaveModel.find()
      .populate("employee", "first_name last_name email")
      .sort({ createdAt: -1 })
      .lean();

    if (!leaves || leaves.length === 0) {
      return res
        .status(404)
        .json({ success: false, statusCode: 404, message: "No leaves found." });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Leaves fetched successfully.",
      count: leaves.length,
      data: leaves,
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

// getLoginUserAllLeaves

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
    const leaves = await LeaveModel.find({ employee:userId}).lean();

       const usedLeaves = leaves.length;
    const leaveBalance = totalLeavesAllowed - usedLeaves;

     const updatedLeaves = leaves.map((leave) => ({
      ...leave,
      leaveBalance,
    }));

    if (!leaves || leaves.length === 0) {
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: "No leaves found for this user.",
        leaveBalance,
        updatedLeaves
      });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Leaves fetched successfully.",
      count: leaves.length,
      data: leaves,
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
