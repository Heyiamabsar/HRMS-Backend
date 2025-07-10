import mongoose from "mongoose";

const NotifySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null if broadcast
    forRoles: [{ type: String, enum: ["admin", "hr", "user"] }], // NEW
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // NEW
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dismissedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    title: {type:String},
    message: {type:String},
    isRead: { type: Boolean, default: false },
    isDismissed: { type: Boolean, default: false },
    link: {type:String},
    type: { type: String, enum: ["admin", "user"], default: "user" },
  },
  { timestamps: true }
);

const notifyModel= mongoose.model('Notification', NotifySchema)

export default notifyModel;