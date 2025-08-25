import mongoose from "mongoose";

const dailyReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  reports: [
    {
      taskGiven: { type: String, required: true },
      taskGivenBy: { type: String, required: true },
      concernedDepartment: { type: String, required: true },
      objective: { type: String, required: true },
      remark: { type: String },
      status: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" }
    }
  ]
}, { timestamps: true });

const DailyReportModel = mongoose.model("DailyReport", dailyReportSchema);

export default DailyReportModel;
