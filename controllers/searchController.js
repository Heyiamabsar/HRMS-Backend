import moment from "moment";
import AttendanceModel from "../models/attendanceModule.js";
import userModel from "../models/userModel.js";






export const getSearchUsers = async (req, res) => {
  try {
    const { page = 1, limit = 15, search = "" } = req.query;

    // Search filter
    const searchFilter = search ? { $text: { $search: search } } : {};
    // Exclude deleted users
    Object.assign(searchFilter, { isDeleted: false });

    // Total count (for pagination)
    const totalUsers = await userModel.countDocuments(searchFilter);

    // Users fetch with pagination
    const users = await userModel
      .find(searchFilter, { score: { $meta: "textScore" } })
      .sort({ score: { $meta: "textScore" } })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate({
        path: "branch",      
        select: "branchName _id",  
      })
      .lean()


    res.status(200).json({
      success: true,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



export const getSearchAttendanceUsers = async (req, res) => {
  try {
    const { page = 1, limit = 15, search = "" } = req.query;

    // Users filter based on search
    let userFilter = { isDeleted: false };

    if (search) {
      userFilter.$or = [
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { userId: { $regex: search, $options: "i" } },
      ];
    }

    const totalUsers = await userModel.countDocuments(userFilter);

    const users = await userModel.find(userFilter)
      .populate({ path: "branch", select: "branchName _id" })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // Optional: add attendance summary for each user
    const today = moment().startOf("day");
    const result = [];

    for (const user of users) {
      const attendanceCount = await AttendanceModel.countDocuments({ userId: user._id });

      result.push({
        userId: user._id,
        empId: user.userId,
        userName: `${user.first_name} ${user.last_name}`,
        userEmail: user.email,
        branch: user.branch?.branchName || null,
        attendanceDays: attendanceCount,
      });
    }

    res.status(200).json({
      success: true,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
      users: result,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users with attendance summary",
      error: error.message,
    });
  }
};
