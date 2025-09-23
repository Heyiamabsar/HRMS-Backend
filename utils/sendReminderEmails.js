import AttendanceModel from "../models/attendanceModule.js";
import { transporter } from "./emailTransporter.js";
import moment from "moment-timezone";

const sendReminderEmails = async (user) => {
  try {

    if (!user.timeZone) {
      console.log(`⏭️ Skipping ${user.email} | No timeZone set`);
      return false;
    }

    // const currentDate = new Date().toISOString().split("T")[0];
    // const currentTime = new Date();
    // const nineAM = new Date(`${currentDate}T09:00:00+05:30`);

    const currentTime = moment().tz(user.timeZone);
    const currentDate = currentTime.format("YYYY-MM-DD");
    const nineAM = moment.tz(`${currentDate} 09:00:00`, "YYYY-MM-DD HH:mm:ss", user.timeZone);

    // Mail window: 5 min pehle se 15 min baad
    if (!currentTime.isBetween(nineAM.clone().subtract(5, 'minutes'), nineAM.clone().add(15, 'minutes'))) {
      console.log(`⏭️ Skipping ${user.email} | Not in 9 AM window (${user.timeZone})`);
      return false;
    }

    const isBefore9 = currentTime.isBefore(nineAM);

    console.log(`User: ${user.email}, Timezone: ${user.timeZone}, Current Time: ${currentTime.format()}, Before 9 AM? ${isBefore9}`);


    const attendance = await AttendanceModel.findOne({
      userId: user._id,
      date: currentDate,
    }).lean();
    // console.log(`[DEBUG] Check-in Time for ${user.email}:`, attendance);
    if (!attendance || !attendance.inTime) {

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
