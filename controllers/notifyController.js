import notifyModel from "../models/notifyModel.js";

export const getNotifications = async (req, res) => {
  try {
    const role = req.user.role;

    const notifications = await notifyModel.find({
      $or: [
        { userId: req.user._id },
        { forRoles: role }
      ]
    })
      .sort({ createdAt: -1 })
      .populate("performedBy", "name role"); // populate who performed it

    res.status(200).json({ success: true , statusCode:200, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false,statusCode:500, message: "Failed to fetch notifications" });
  }
};




export const markNotificationAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;

    const notification = await notifyModel.findOne({
      _id: notificationId,
      userId: req.user._id, // only allow user to mark their own
    });

    if (!notification) {
      return res.status(404).json({ success: false,statusCode:404, message: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      statusCode:200,
      message: "Notification marked as read",
    });
  } catch (error) {
    res.status(500).json({ success: false, statusCode:500, message: "Something went wrong" });
  }
};

