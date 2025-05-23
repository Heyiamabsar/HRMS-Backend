import LeaveModel from "../models/leaveModel.js";
import userModel from "../models/userModel.js";



export const applyLeave= async (req, res) => {
    try {
        console.log("Leave application request body:", req.body);
        console.log("Leave application request user:", req.body.userId);
        const {employee , userId, leaveType, fromDate, toDate, reason } = req.body;
        const employeeId = userId
        const leaveDays = Math.ceil((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)) + 1;
        const existingLeaves = await LeaveModel.find({ employee: employeeId });
        const totalLeaveTaken = existingLeaves.reduce((acc, leave) => acc + leave.leaveTaken, 0);
        const leaveBalance = 20 - totalLeaveTaken;

       if (leaveBalance < leaveDays) {
      return res.status(400).json({ message: 'Insufficient leave balance' });
    }


    const leave = await LeaveModel.create({
        employee: userId,
        userId: userId,
        leaveType,
        fromDate,
        toDate,
        reason,
        leaveTaken: leaveDays,
        leaveBalance: leaveBalance - leaveDays,
        maximumLeave: 20
    });
    await leave.save();
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
console.log("Leave status update request body:", leaveId);
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const leave = await LeaveModel.findById(leaveId);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

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
    console.error("Error in getAllLeavesStatus:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Failed to fetch leaves.",
      error: error.message
    });
  }
};


export const getMyLeaves = async (req, res) => {
  try {
    const leaves = await LeaveModel.find({ employee: req.user.id }).populate('employee', 'first_name last_name email');
    res.status(200).json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your leaves', error: error.message });
  }
};