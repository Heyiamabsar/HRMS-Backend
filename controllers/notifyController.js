import notifyModel from "../models/notifyModel.js";

export const getNotifications = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user._id.toString();
    const notifications = await notifyModel.find({
      $or: [
        { userId: req.user._id },
        { forRoles: role }
      ]
    })
      .sort({ createdAt: -1 })
      .populate("performedBy", "name role").lean(); 

      const data = notifications.map((n) => {
      const isRead = n.userId
        ? n.isRead
        : n.readBy?.some(id => id.toString() === userId);

      return { ...n, isRead };
    });
    

    res.status(200).json({ success: true , statusCode:200, data });
  } catch (err) {
    res.status(500).json({ success: false,statusCode:500, message: "Failed to fetch notifications" });
  }
};




export const markNotificationAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;

    const notification = await notifyModel.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ success: false, statusCode: 404, message: "Notification not found" });
    }

    const userId = req.user._id;

    if (notification.readBy?.some(id => id.toString() === userId.toString())) {
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Already marked as read"
      });
    }

    notification.readBy.push(userId);
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

