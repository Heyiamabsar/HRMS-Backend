// import userModel from "./models/userModel.js";
// import branchModel from "./models/branchModel.js";

import branchModel from "../models/branchModel.js";
import userModel from "../models/userModel.js";

// export const migrateBranches = async () => {
//   const users = await userModel.find({ branch: { $type: "string" } });

//   for (const user of users) {
//    console.log("User Branch:", user.branch);
// const branch = await branchModel.findOne({
//   branchName: { $regex: `^${user.branch.trim()}$`, $options: "i" }
// });
// console.log("Found Branch:", branch);

//     if (branch) {
//       user.branch = branch._id;
//       await user.save();
//       console.log(`Updated user ${user.email} to branch ${branch._id}`);
//     } else {
//       console.log(`Branch not found for user ${user.email} with branch ${user.branch}`);
//     }
//   }
// };

// migrateBranches();


export const migrateBranches = async () => {
  const users = await userModel.find({
    branch: { $exists: true, $type: "string" } // Only users with branch as string
  });

  console.log(`Found ${users.length} users with string branch`);

  for (const user of users) {
    if (!user.branch || typeof user.branch !== "string" || user.branch.trim() === "") {
      console.log(`Skipping user ${user.email} → Invalid branch value`);
      continue;
    }

    const cleanBranch = user.branch.trim();

    console.log(`Processing user: ${user.email} | Branch: ${cleanBranch}`);

    const branch = await branchModel.findOne({
      branchName: { $regex: `^${cleanBranch.replace(/[,]+$/, "")}$`, $options: "i" }
    });

    if (branch) {
      user.branch = branch._id;
      await user.save();
      console.log(`✅ Updated user ${user.email} → branch ${branch.branchName}`);
    } else {
      console.log(`❌ Branch not found for user ${user.email} with branch ${cleanBranch}`);
    }
  }
};
