import LeaveModel from "../models/leaveModel.js";
import userModel from "../models/userModel.js";
import mongoose from 'mongoose';


export const applyLeave= async (req, res) => {
    try {
        const { leaveType, fromDate, toDate, reason } = req.body;

        const leaveDays = Math.ceil((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)) + 1;
        // const existingLeaves = await LeaveModel.find({ employee: req.user?._id });
        // const totalLeaveTaken = existingLeaves.reduce((acc, leave) => acc + leave.leaveTaken, 0);
        // const leaveBalance = 20 - totalLeaveTaken;
    
  const leave = await LeaveModel.create({
      employee: req.user?._id,
      userId: req.user?._id,
      leaveType,
      fromDate,
      toDate,
      reason,
      leaveTaken: leaveDays,
      maximumLeave: 20,
      status: 'pending' // default status
    });


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
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const leave = await LeaveModel.findById(leaveId);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

     if (status === 'approved') {
      const existingLeaves = await LeaveModel.find({ 
        employee: leave.employee,
        status: 'approved'
      });

      const totalLeaveTaken = existingLeaves.reduce((acc, leave) => acc + leave.leaveTaken, 0);
      const leaveBalance = 20 - totalLeaveTaken;

      if (leaveBalance < totalLeaveTaken) {
        return res.status(400).json({ message: 'Insufficient leave balance' });
      }
        leave.leaveBalance = leaveBalance - leave.leaveTaken;
    }

    leave.status = status;
    await leave.save();

    res.status(200).json({ message: `Leave ${status} successfully`, leave });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update leave status', error: error.message });
  }
};


export const getAllLeavesStatus = async (req, res) => {
  try {
    const leaves = await LeaveModel.find()
      .populate("employee", "first_name last_name email")
      .sort({ createdAt: -1 })
      .lean();

    if (!leaves || leaves.length === 0) {
      return res.status(404).json({ message: "No leaves found." });
    }

    res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves
    });

  } catch (error) {
    res.status(500).json({
      success: false,
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
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    const leaves = await LeaveModel.find({ employee: userId })
      .populate("employee", "first_name last_name email")
      .sort({ createdAt: -1 });

    if (!leaves || leaves.length === 0) {
      return res.status(404).json({ success: false, message: "No leaves found for this user." });
    }

    res.status(200).json({
      success: true,
      count: leaves.length,
      message: "Leaves fetched successfully.",
      data: leaves,
    });
  } catch (error) {
    console.error("Error in getLeavesByUserId:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Failed to fetch leaves by user ID.",
      error: error.message,
    });
  }
};

// getLoginUserAllLeaves

export const getLoginUserAllLeaves = async (req, res) => {
  try {
    if (!req.user || !req.user?._id) {
      return res.status(400).json({ message: 'User not authenticated' });
    }
    console.log("Fetching leaves for user:", req.user?._id);
    const leaves = await LeaveModel.find({ employee: req.user?._id });

    if (!leaves || leaves.length === 0) {
      return res.status(404).json({ message: "No leaves found for this user." });
    }

    res.status(200).json({
      success: true,
      message: "Leaves fetched successfully.",
      count: leaves.length,
      data: leaves
      
    });

  } catch (error) {
    console.error("Error in getLoginUserAllLeaves:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Failed to fetch user's leaves.",
      error: error.message
    });
  }
}