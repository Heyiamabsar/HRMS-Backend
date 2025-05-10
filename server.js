import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import connectDB from "./config/dbConnection.js";
import cors from "cors";
import employeeRouter from "./routes/employeeRoutes.js";
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
