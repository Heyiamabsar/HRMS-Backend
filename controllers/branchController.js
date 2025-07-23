import branchModel from "../models/branchModel.js";
import userModel from "../models/userModel.js";



export const createBranch = async (req, res) => {
  try {
    const { branchName, country, branchCode, associatedUsers, address, timeZone } = req.body;

    if (!branchName || !country || !branchCode || !address ) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const existingBranch = await branchModel.findOne({ branchCode });
    if (existingBranch) {
      return res.status(409).json({ success: false, message: "Branch with this code already exists." });
    }

    const newBranch = await branchModel.create({
      branchName,
      country,
      branchCode,
      associatedUsers: associatedUsers || 0,
      address,
      timeZone
    });

    res.status(201).json({ success: true, branch: newBranch });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error during branch creation.", error: error.message });
  }
};


export const getAllBranches = async (req, res) => {
  try {
    const branches = await branchModel.find();


    const updatedBranches = await Promise.all(
      branches.map(async (branch) => {
        const users = await userModel.find({ branch: branch.branchName }).select('name first_name last_name email role'); 
        return {
          ...branch.toObject(),
          associatedUsersCount: users.length,
          associatedUsersList: users,
        };
      })
    );

    res.status(200).json({ success: true, branches: updatedBranches });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching branches.", error: error.message });
  }
};


export const getBranchById = async (req, res) => {
  try {
    const branch = await branchModel.findById(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: "Branch not found" });

    const users = await userModel.find({ branch: branch.branchName }).select('name first_name last_name email role');

    res.status(200).json({
      success: true,
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

