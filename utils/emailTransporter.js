import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "Outlook",
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_EMAIL_PASS,
  },
});

