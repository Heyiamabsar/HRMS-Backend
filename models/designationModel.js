// models/Designation.js
import mongoose from "mongoose";

const designationSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  }
});
const designationModel =  mongoose.model("Designation", designationSchema);

export default designationModel;