// jobs/checkInReminderJob.js
import cron from "node-cron";
import sendReminderEmails, { transporter } from "./sendReminderEmails.js";
import userModel from "../models/userModel.js";

const testMode = process.env.TEST_MODE === "true";
const reminderCounts = {};

export const startCheckInReminderJob = async () => {
  const users = await userModel.find({ role: { $in: ["employee", "hr"] } });

  transporter.verify((err, success) => {
    if (err) {
      console.error("❌ SMTP verification failed:", err.message);
    } else {
      console.log("✅ SMTP connection ready");
    }
  });

  const sendReminders = async () => {
    console.log(`🕐 Running check-in reminder job...`);

    for (const [index, user] of users.entries()) {
      const userId = user._id.toString();

      if (!reminderCounts[userId]) reminderCounts[userId] = 0;

      if (testMode || reminderCounts[userId] < 5) {
        setTimeout(async () => {
          console.log(
            `[${testMode ? "TEST" : "PROD"}] Sending reminder to: ${user.email}`
          );
          await sendReminderEmails(user);
          if (!testMode) reminderCounts[userId]++;
        }, index * 5000);
      }
    }
  };

  // const cronExpression = testMode ? "*/1 * * * *" : "30,40,50 8 * * *,0,10,20 9 * * *";
  if (testMode) {
    cron.schedule("*/1 * * * *", sendReminders, {
      timezone: "Asia/Kolkata",
    });
  } else {
    // 8:30, 8:40, 8:50
    cron.schedule("30,40,50 8 * * *", sendReminders, {
      timezone: "Asia/Kolkata",
    });

    // 9:00, 9:10, 9:20
    cron.schedule("0,10,20 9 * * *", sendReminders, {
      timezone: "Asia/Kolkata",
    });
  }

  // cron.schedule(
  //   cronExpression,
  // async () => {
  //   console.log(`🕐 Running check-in reminder job...`);

  //   for (const [index, user] of users.entries()) {
  //     const userId = user._id.toString();

  //     if (!reminderCounts[userId]) reminderCounts[userId] = 0;

  //     if (testMode || reminderCounts[userId] < 5) {
  //       setTimeout(async () => {
  //         console.log(`[${testMode ? "TEST" : "PROD"}] Sending reminder to: ${user.email}`);
  //         await sendReminderEmails(user);
  //         if (!testMode) reminderCounts[userId]++;
  //       }, index * 5000); // Delay 5s between each
  //     }
  //   }
  // },
  //   {
  //     scheduled: true,
  //     timezone: "Asia/Kolkata",
  //   }
  // );

  // cron.schedule("0 9 * * *", async () => {
  //   if (reminderCount < 5) {
  //     await sendReminderEmails(user); // Pass specific user
  //     reminderCount++;
  //   }
  // }, {
  //   scheduled: true,
  //   timezone,
  // });
};
