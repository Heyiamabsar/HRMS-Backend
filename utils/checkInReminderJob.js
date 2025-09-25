// startCheckInReminderJob.js
import cron from "node-cron";
import moment from "moment-timezone";
import sendReminderEmails from "./sendReminderEmails.js";
import userModel from "../models/userModel.js";
import AttendanceModel from "../models/attendanceModule.js";
import { transporter } from "./emailTransporter.js";
import { skipEmails, withoutDeletedUsers } from "./commonUtils.js";

const reminderTracker = {}; // track last reminder sent per user

export const startCheckInReminderJob = async () => {
  // Verify SMTP
  transporter.verify((err) => {
    if (err) console.error("❌ SMTP verification failed:", err.message);
    else console.log("✅ SMTP connection ready");
  });

  const sendReminders = async () => {
    console.log(`🕐 Running check-in reminder job...`);

    const users = await userModel.find(
      withoutDeletedUsers({ role: { $in: ["employee", "hr", "admin", "superAdmin"] } })
    );

    console.log(`Found ${users.length} users to check reminders`);

    for (const user of users) {
      if (!user.timeZone) {
        console.log(`⏭️ Skipping ${user.email} | No timeZone set`);
        continue;
      }

      if (skipEmails.includes(user.email)) {
        console.log(`⏭️ Skipping ${user.email} | In skipEmails list`);
        continue;
      }

      const userId = user._id.toString();

      // Current time in user's timezone
      const currentTime = moment().tz(user.timeZone);
      const currentDate = currentTime.format("YYYY-MM-DD");
      const nineAM = moment.tz(`${currentDate} 09:00:00`, "YYYY-MM-DD HH:mm:ss", user.timeZone);

      const windowStart = nineAM.clone().subtract(10, "minutes");
      const windowEnd = nineAM.clone().add(15, "minutes");

      console.log({
        user: user.email,
        localTime: currentTime.format(),
        nineAMWindow: windowStart.format() + " - " + windowEnd.format(),
      });

      // Skip if not in 9 AM window
      if (!currentTime.isBetween(windowStart, windowEnd, null, "[)")) {
        console.log(`⏭️ Skipping ${user.email} | Not in 9 AM window (${user.timeZone})`);
        continue;
      }

      // Skip if reminder already sent in this window
      if (reminderTracker[userId]) {
        const lastSent = reminderTracker[userId];
        if (currentTime.diff(lastSent, "minutes") < 20) {
          console.log(`⏭️ Skipping ${user.email} | Reminder already sent in this window`);
          continue;
        }
      }

      const sent = await sendReminderEmails(user);
      if (sent) reminderTracker[userId] = currentTime;
    }
  };

  // Cron schedule: every 1 min (safer for window precision)
  cron.schedule("*/1 * * * *", sendReminders, { timezone: "UTC" });

  console.log("✅ Check-in reminder cron job started (AWS UTC server)");
};
