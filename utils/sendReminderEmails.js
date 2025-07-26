// utils/sendReminderEmails.js
import nodemailer from "nodemailer";
import userModel from "../models/userModel.js";
import AttendanceModel from "../models/attendanceModule.js";

export const transporter = nodemailer.createTransport({
  service: "Outlook",
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_EMAIL_PASS,
  },
});
const sendReminderEmails = async (user) => {
  try {
    console.log(user?.email);
    const currentDate = new Date().toISOString().split("T")[0];
    console.log(
      `📨 Processing reminder for: ${user?.email} | Date: ${currentDate}`
    );

    const attendance = await AttendanceModel.findOne({
      user: user._id,
      date: currentDate,
    });

    if (!attendance) {
      const mailOptions = {
        from: process.env.ADMIN_EMAIL,
        to: user.email,
        subject: "Reminder: Missing Check-In",
        text: `Hi ${user?.first_name} ${user?.last_name},\n\nWe noticed you haven't checked in yet today.\nPlease remember to punch-in as soon as possible.\n\nThanks!`,
      };
      const info = await transporter.sendMail(mailOptions);

      console.log(
        `✅ Reminder sent to ${user?.email} | Message ID: ${info?.messageId}`
      );
    } else {
      console.log(`✅ ${user.email} has already checked in.`);
    }
  } catch (err) {
    console.error("❌ Failed to send reminder emails:", err.message);
  }
};

export default sendReminderEmails;
