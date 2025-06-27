// models/Holiday.js
import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema({
  date: {
    type: Date,
    unique: true,
    required: true,
  },
  reason: {
    type: String,
    default: "Sunday",
  },
  isCustom: {
    type: Boolean,
    default: false,
  },
  isOptional: {
    type: Boolean,
    default: false,
  }
});

const holidayModel = mongoose.model("Holiday", holidaySchema);

export default holidayModel;
