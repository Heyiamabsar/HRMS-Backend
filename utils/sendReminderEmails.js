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
    const currentTime = new Date();

    const attendance = await AttendanceModel.findOne({
      user: user._id,
      date: currentDate,
    });

    if (!attendance || !attendance.checkInTime) {
      const nineAM = new Date();
      nineAM.setHours(9, 0, 0, 0);

      const isBefore9 = currentTime < nineAM;

      const subject = isBefore9
        ? "Reminder: Do not forget to do your check-in"
        : "Reminder: You have not checked-in!";

      const text = isBefore9
        ? `Hi ${user?.first_name} ${user?.last_name},\n\nReminder for check-in\n\nYour shift begins at 09:00 AM. Please ensure that your attendance is marked.\n\nThanks!`
        : `Hi ${user?.first_name} ${user?.last_name},\n\nReminder for check-in\n\nYour shift has already begun. Have you marked your attendance?\n\nThanks!`;

      const mailOptions = {
        from: process.env.ADMIN_EMAIL,
        to: user.email,
        subject,
        text,
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
