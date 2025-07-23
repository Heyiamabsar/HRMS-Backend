import departmentModel from "../models/departmentModel.js";
import userModel from "../models/userModel.js";

export const getAllDepartments = async (req, res) => {
  try {
    // console.log("test")
    const departments = await departmentModel.find()
    const result = await Promise.all(
      departments.map(async (dept) => {
        const users = await userModel.find({ department: dept.name }).select('name first_name last_name email role');
        return {
          ...dept.toObject(),
          associatedUsersCount: users.length,
          // associatedUsersList: users
        };
      })
    );
    res.status(200).json({
      success: true,
      statusCode: 200,
      data: departments,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to fetch departments",
      error: error.stack,
    });
  }
};


export const getDepartmentById = async (req, res) => {
  try {
    const department = await departmentModel.findById(req.params.id);
    if (!department) return res.status(404).json({ success: false, message: "Department not found" });

    const users = await userModel.find({ department: department.name }).select('name first_name last_name email role');

    res.status(200).json({
      success: true,
      department: {
        ...department.toObject(),
        associatedUsersCount: users.length,
        associatedUsersList: users
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch department", error: error.message });
  }
};

