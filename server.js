import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import connectDB from "./config/dbConnection.js";
import cors from "cors";
import employeeRouter from "./routes/employeeRoutes.js";
import hrRouter from "./routes/hrRoutes.js";
import uploadRouter from "./routes/uploadRoutes.js";
import leaveRouter from "./routes/leaveRoutes.js";
import attendanceRouter from "./routes/attendanceRoutes.js";
import holidayRouter from "./routes/holidayRoutes.js";
import payrollRouter from "./routes/payrollRoutes.js";
import cloudExcelRouter from "./routes/cloudExcelRoutes.js";
import path from 'path';
import { fileURLToPath } from 'url';
import reportRouter from "./routes/reportsRoutes.js";
import notificationRouter from "./routes/notifyRoutes.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config();
const app = express();
app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  "https://hrms-frontend-git-dev-falcon-infotechs-projects.vercel.app",
  "https://hrms-frontend-amber.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {

    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));
app.options('*', cors()); 


app.use('/downloads', express.static(path.join(__dirname, 'public/downloads')));
app.use("/api/auth", authRoutes);
app.use("/api/payroll", payrollRouter);
app.use("/api/employee", employeeRouter);
app.use("/api/hr", hrRouter);
app.use('/api', uploadRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/leaves', leaveRouter);
app.use('/api/report', reportRouter);
app.use('/api/holidays', holidayRouter);
app.use('/api/cloud_excel', cloudExcelRouter);
app.use('/api/notifications', notificationRouter);

app.get("/", (req, res) => {
  res.send("HRMS Backend is running ");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
