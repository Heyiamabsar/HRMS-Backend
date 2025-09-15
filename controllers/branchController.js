import branchModel from "../models/branchModel.js";
import userModel from "../models/userModel.js";
import { withoutDeletedUsers } from "../utils/commonUtils.js";



export const createBranch = async (req, res) => {
  try {
    const { branchName, country, branchCode, associatedUsers, address, timeZone, weekends } = req.body;

    if (!branchName || !country || !branchCode || !address ) {
      return res.status(400).json({ success: false,statusCode:400, message: "All fields are required." });
    }

    const existingBranch = await branchModel.findOne({ branchCode });
    if (existingBranch) {
      return res.status(409).json({ success: false,statusCode:409 ,message: "Branch with this code already exists." });
    }

    const newBranch = await branchModel.create({
      branchName,
      country,
      branchCode,
      associatedUsers: associatedUsers || 0,
      address,
      timeZone,
      weekends: weekends || []
    });

    res.status(201).json({ success: true, statusCode:201,message:"Branch created successfully", branch: newBranch });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error during branch creation.", error: error.message });
  }
};


export const getAllBranches = async (req, res) => {
  try {
    const branches = await branchModel.find();


    const updatedBranches = await Promise.all(
      branches.map(async (branch) => {
        const users = await userModel.find(withoutDeletedUsers({ branch: branch._id })).select('name first_name last_name email role');
        return {
          ...branch.toObject(),
          associatedUsersCount: users.length,
          // associatedUsersList: users,
        };
      })
    );

    res.status(200).json({ success: true,statusCode:200, message:"All branch fetch successfully",branches: updatedBranches });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching branches.", error: error.message });
  }
};


export const getBranchById = async (req, res) => {
  try {
    const branch = await branchModel.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: "Branch not found" });

    const users = await userModel.find(withoutDeletedUsers({ branch: branch._id })).select('name first_name last_name email role');

    res.status(200).json({
      success: true,
      message: "Branch fetched successfully",
      statusCode:200,
      branch: {
        ...branch.toObject(),
        associatedUsersCount: users.length,
        associatedUsersList: users
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch branch", error: error.message });
  }
};


export const updateBranch = async (req, res) => {
try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate weekends if present
    if (updateData.weekends && !Array.isArray(updateData.weekends)) {
      return res.status(400).json({
        success: false,
        message: "Please provide weekends as an array",
      });
    }

    // Get current branch before updating
    const existingBranch = await branchModel.findById(id);
    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    const oldBranchName = existingBranch.branchName;
    const updatedBranch = await branchModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    // If branchName was changed, update userModel
    if (
      updateData.branchName &&
      updateData.branchName !== oldBranchName
    ) {
      await userModel.updateMany(
        { branch: oldBranchName },
        { $set: { branch: updateData.branchName } }
      );
    }

    res.status(200).json({
      success: true,
      message: "Branch updated successfully",
      branch: updatedBranch,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error updating branch",
      error: err.message,
    });
  }
};




