
import notifyModel from "../models/notifyModel.js";
import userModel from "../models/userModel.js";


export const sendNotification = async ({ userId = null, forRoles = [], title, message, link, type = "user", performedBy = null }) => {
  try {
    if (forRoles.length > 0) {

      await notifyModel.create({
        userId: null,       
        forRoles,           
        title,
        message,
        link,
        type,
        performedBy,
      });
    } else {
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
