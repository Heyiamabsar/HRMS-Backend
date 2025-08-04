import designationModel from "../models/designationModel.js";
import userModel from "../models/userModel.js";
import { withoutDeletedUsers } from "../utils/commonUtils.js";

export const getAllDesignations = async (req, res) => {
  try {
    const designations = await designationModel.find().sort({ name: 1 });

        const result = await Promise.all(
        designations.map(async (design) => {
        const users = await userModel.find(withoutDeletedUsers({ designation: design.name })).select('name first_name last_name email role');
        return {
          ...design.toObject(),
          associatedUsersCount: users.length,
          // associatedUsersList: users
        };
      })
    );

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: designations,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to fetch designations",
      error: error.message,
    });
  }
};



export const getDesignationById = async (req, res) => {
  try {
    const designation = await designationModel.findById(req.params.id);
    if (!designation) return res.status(404).json({ success: false, message: "Designation not found" });

    const users = await userModel.find(withoutDeletedUsers({ designation: designation.name })).select('name first_name last_name email role');

    res.status(200).json({
      success: true,
      designation: {
        ...designation.toObject(),
        associatedUsersCount: users.length,
        associatedUsersList: users
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch designation", error: error.message });
  }
};