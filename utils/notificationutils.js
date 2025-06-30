
import notifyModel from "../models/notifyModel.js";
import userModel from "../models/userModel.js";


export const sendNotification = async ({ userId = null, forRoles = [], title, message, link, type = "user", performedBy = null }) => {
  try {
    if (forRoles.length > 0) {
      // Broadcast to all users with these roles
      const users = await userModel.find({ role: { $in: forRoles } });

      const notification = users.map((user) => ({
        userId: user._id,
        forRoles,
        title,
        message,
        link,
        type,
        performedBy,
      }));

      await notifyModel.insertMany(notification);
    } else {
      // Single user notification
      await notifyModel.create({
        userId,
        forRoles,
        title,
        message,
        link,
        type,
        performedBy,
      });
    }
  } catch (error) {
    console.error("notifyModel Error:", error.message);
  }
};
