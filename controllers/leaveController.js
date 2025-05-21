import LeaveModel from "../models/leaveModel.js";
import userModel from "../models/userModel.js";



export const applyLeave= async (req, res) => {
    try {
        console.log("Leave application request body:", req.body);
        console.log("Leave application request user:", req.userId);
        const {employee , userId, leaveType, fromDate, toDate, reason } = req.body;
        const employeeId = req.userId;
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