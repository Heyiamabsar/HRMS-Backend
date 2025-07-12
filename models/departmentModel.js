// models/Department.js
import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  }
});
const departmentModel = mongoose.model("Department", departmentSchema);
export default departmentModel;
