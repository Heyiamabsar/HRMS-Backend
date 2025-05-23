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


dotenv.config();
const app = express();
app.use(express.json());

app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE","PATCH"],
    credentials: true,
}));

app.use("/api/auth", authRoutes);
app.use("/api/employee", employeeRouter);
app.use("/api/hr", hrRouter);
app.use('/api', uploadRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/leaves', leaveRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
