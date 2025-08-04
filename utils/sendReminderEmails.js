import AttendanceModel from "../models/attendanceModule.js";
import { transporter } from "./emailTransporter.js";

const sendReminderEmails = async (user) => {
  try {
    const currentDate = new Date().toISOString().split("T")[0];
    const currentTime = new Date();
    const nineAM = new Date(`${currentDate}T09:00:00+05:30`);

    const attendance = await AttendanceModel.findOne({
      userId: user._id,
      date: currentDate,
    }).lean();
      console.log(`[DEBUG] Check-in Time for ${user.email}:`, attendance);
    if (!attendance || !attendance.inTime) {

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
      console.log("🕒 Now:", currentTime.toLocaleString());
      console.log("⏰ 9 AM IST:", nineAM.toLocaleString());
      console.log("⏳ isBefore9:", isBefore9);
      const info = await transporter.sendMail(mailOptions);

      console.log(
        `✅ Reminder sent to ${user?.email} | Message ID: ${info?.messageId}`
      );
      return true;
    } else {
      console.log(`✅ ${user.email} has already checked in.`);
      return false;
    }
  } catch (err) {
    console.error("❌ Failed to send reminder emails:", err.message);
    return false;
  }
};

export default sendReminderEmails;
