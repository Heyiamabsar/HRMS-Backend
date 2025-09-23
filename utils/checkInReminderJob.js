import cron from "node-cron";
import sendReminderEmails from "./sendReminderEmails.js";
import userModel from "../models/userModel.js";
import AttendanceModel from "../models/attendanceModule.js";
import { transporter } from "./emailTransporter.js";
import { skipEmails, withoutDeletedUsers } from "./commonUtils.js";

const testMode = process.env.TEST_MODE === "true";
const reminderCounts = {};

export const startCheckInReminderJob = async () => {
  transporter.verify((err, success) => {
    if (err) {
      console.error("❌ SMTP verification failed:", err.message);
    } else {
      console.log("✅ SMTP connection ready");
    }
  });

  const sendReminders = async () => {
    console.log(`🕐 Running check-in reminder job...`);

    // const users = await userModel.find({ role: { $in: ["employee", "hr"] } });
    const users = await userModel.find(withoutDeletedUsers({ role: { $in: ["employee", "hr", "admin", 'superAdmin'] } }));

    console.log(`Found ${users.length} users to send reminders`);

    //   for (const [index, user] of users.entries()) {
    //       if (skipEmails.includes(user.email)) {
    //   console.log(`⏭️ Skipping reminder for ${user.email}`);
    //   continue;
    // }
    for (const [index, user] of users.entries()) {
      if (!user.timeZone) {
        console.log(`⏭️ Skipping ${user.email} (no timeZone set)`);
        continue;
      }

      if (skipEmails.includes(user.email)) {
        console.log(`⏭️ Skipping reminder for ${user.email}`);
        continue;
      }

      const userId = user._id.toString();

      if (!reminderCounts[userId]) reminderCounts[userId] = 0;

      // if (testMode || reminderCounts[userId] < 4) {
      //   setTimeout(async () => {
      //     const sent = await sendReminderEmails(user);
      //     // console.log(`📧 [${new Date().toLocaleTimeString()}] Preparing to send mail to ${user.email}`);
      //     if (sent && !testMode) reminderCounts[userId]++;
      //   }, index * 5000);
      // }


      if (testMode || reminderCounts[userId] < 4) {
        const sent = await sendReminderEmails(user);
        if (sent && !testMode) reminderCounts[userId]++;
      }

    }
  };

  if (testMode) {
    console.log("✅ Running in TEST mode - Cron every 2 min");
    cron.schedule("*/2 * * * *", sendReminders, {
      timeZone: "Asia/Kolkata",
    });
  } else {
    console.log("✅ Running in PROD mode - Scheduled reminders");
    // 8:30, 8:40, 8:50
    // cron.schedule("45,55 8 * * *", sendReminders, {
    //   timeZone: "Asia/Kolkata",
    // });

    // // 9:00, 9:10, 9:20
    // cron.schedule("10,20 9 * * *", sendReminders, {
    //   timeZone: "Asia/Kolkata",
    // });
    cron.schedule("*/5 * * * *", sendReminders, { timezone: "Asia/Kolkata" });
  }
};
