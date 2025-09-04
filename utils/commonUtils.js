import branchModel from "../models/branchModel.js";
import holidayModel from "../models/holidayModule.js";
import mongoose from "mongoose";

export const getBranchHolidaysForUser = async (user) => {
  try {
    let branchId;

    if (!user.branch) {
      throw new Error("User does not have a branch assigned");
    }

    // ✅ If branch is populated object
    if (typeof user.branch === "object" && user.branch._id) {
      branchId = user.branch._id;
    } 
    // ✅ If branch is string (ObjectId or branch name)
    else if (typeof user.branch === "string") {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(user.branch);

      const branch = await branchModel.findOne(
        isValidObjectId
          ? { _id: user.branch }
          : { branchName: { $regex: `^${user.branch.trim()}$`, $options: "i" } }
      );

      if (!branch) {
        throw new Error(`Branch not found for ${user.branch}`);
      }

      branchId = branch._id;
    } 
    else {
      throw new Error("Invalid branch format in user data");
    }

    // ✅ Fetch holidays for this branch
    const holidays = await holidayModel.find({
      branch: branchId,
      isOptional: false
    }).lean();

    return holidays;
  } catch (error) {
    console.error("Error in getBranchHolidaysForUser:", error.message);
    return [];
  }
};



export const skipEmails = ["faisalad@gmail.com", "dummy@gmail.com",'faisalem@gmail.com','faisalem13@gmail.com','faisalem14@gmail.com','faisalem15@gmail.com',"fmslhr@gmail.com","fmslhr1@gmail.com","fmslhr2@gmail.com","fmslhr3@gmail.com","super@gmail.com",];


export const withoutDeletedUsers = (baseFilter = {}) => ({
  ...baseFilter,
  isDeleted: false,
});