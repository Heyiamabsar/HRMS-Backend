import AttendanceModel from "../models/attendanceModule.js";
import LeaveModel from "../models/leaveModel.js";
import userModel from "../models/userModel.js";
import mongoose from 'mongoose';
import moment from 'moment-timezone';


export const applyLeave= async (req, res) => {
    try {
        const { leaveType, fromDate, toDate, reason } = req.body;
        console.log("Request body",req.body)

        const leaveDays = Math.ceil((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)) + 1;
    console.log("leaves Days",leaveDays)
      const leave = await LeaveModel.create({
          employee: req.user?._id,
          userId: req.user?._id,
          leaveType,
          fromDate,
          toDate,
          reason,
          leaveTaken: leaveDays,
          maximumLeave: 14,
          status: 'pending' // default status
        });

        console.log('leave',leave)

    res.status(201).json({ 
        success:true,
        statusCode:201,
        message: 'Leave applied successfully', 
        leave 
    });

    } catch (error) {
        res.status(500).json({ statusCode: 500, success: false, message: 'Failed to apply leave', error: error.message });
        
    }
}


export const updateLeaveStatus = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const { status, fromDate, toDate } = req.body;

    console.log('Request Body updateApi',req.body)
    console.log('leaveId',leaveId)

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, statusCode: 400, message: 'Invalid status' });
    }

    const leave = await LeaveModel.findById(leaveId);
console.log('leave update Api',leave)
    if (!leave) {
      return res.status(404).json({ success: false, statusCode: 404, message: 'Leave not found' });
    }

    if (status === 'approved') {
      // Get all approved leaves of the employee
      const existingLeaves = await LeaveModel.find({
        employee: leave.employee,
        status: 'approved'
      });
      console.log("existingLeaves",existingLeaves)

      const totalLeaveTaken = existingLeaves.reduce((acc, leave) => acc + leave.leaveTaken, 0);
      const leaveBalance = 14 - totalLeaveTaken;
      
     console.log('totalLeaveTaken',totalLeaveTaken)
     console.log('leaveBalance',leaveBalance)

      if (leaveBalance < leave.leaveTaken) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: 'Insufficient leave balance'
        });
      }

      // Update attendance status to "Leave" for each day in the range
      // for (let date = moment(fromDate); date.isSameOrBefore(toDate); date.add(1, 'days')) {
      //   const formattedDate = date.format('YYYY-MM-DD');

      //   const updated = await AttendanceModel.findOneAndUpdate(
      //     {
      //       date: formattedDate,
      //       userId: mongoose.Types.ObjectId(leave.employee)
      //     },
      //     { status: 'Leave' },
      //     { new: true }
      //   );

      //   if (!updated) {
      //     console.log(`No attendance found for ${formattedDate}, creating new...`);
      //     await AttendanceModel.create({
      //       userId: leave.employee,
      //       date: formattedDate,
      //       status: 'Leave'
      //     });
      //   } else {
      //     console.log(`Marked Leave on ${formattedDate}`);
      //   }
      // }
      const dates = [];
      console.log('dates before',dates)
      for (let date = moment(fromDate); date.isSameOrBefore(toDate); date.add(1, 'days')) {
  dates.push(date.format('YYYY-MM-DD'));
}
      console.log('dates After',dates)

const operations = dates.map(date => ({
  updateOne: {
    filter: { date, userId: leave.employee },
    update: { $set: { status: 'Leave' } },
    upsert: true // If not found, insert it
  }
}));
console.log("operations",operations)

await AttendanceModel.bulkWrite(operations);

      leave.leaveBalance = leaveBalance - leave.leaveTaken;
    }

    leave.status = status;
    await leave.save();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Leave ${status} successfully`,
      leave
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Failed to update leave status',
      error: error.message
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
      return res.status(404).json({ success: false, statusCode: 404, message: "No leaves found." });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Leaves fetched successfully.",
      count: leaves.length,
      data: leaves
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error. Failed to fetch leaves.",
      error: error.message
    });
  }
};


export const getLeavesByUserId = async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, statusCode: 400, message: "Invalid user ID." });
    }

    const leaves = await LeaveModel.find({ employee: userId })
      .populate("employee", "first_name last_name email")
      .sort({ createdAt: -1 });

    if (!leaves || leaves.length === 0) {
      return res.status(404).json({ success: false, statusCode: 404, message: "No leaves found for this user." });
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
      return res.status(400).json({ success: false, statusCode: 400, message: 'User not authenticated' });
    }
    console.log("Fetching leaves for user:", req.user?._id);
    const leaves = await LeaveModel.find({ employee: req.user?._id });

    if (!leaves || leaves.length === 0) {
      return res.status(404).json({ success: false, statusCode: 404, message: "No leaves found for this user." });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Leaves fetched successfully.",
      count: leaves.length,
      data: leaves
      
    });

  } catch (error) {
    console.error("Error in getLoginUserAllLeaves:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error. Failed to fetch user's leaves.",
      error: error.message
    });
  }
}