import mongoose from "mongoose";

const NotifySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null if broadcast
    forRoles: [{ type: String, enum: ["admin", "hr", "user"] }], // NEW
    title: String,
    message: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // NEW
    isRead: { type: Boolean, default: false },
    link: String,
    type: { type: String, enum: ["admin", "user"], default: "user" },
  },
  { timestamps: true }
);

const notifyModel= mongoose.model('Notification', NotifySchema)

export default notifyModel;