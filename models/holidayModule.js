import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true
  },
  isCustom: {
    type: Boolean,
    default: false
  },
  isOptional: {
    type: Boolean,
    default: false
  }
});

holidaySchema.index({ date: 1, branch: 1 }, { unique: true });

const holidayModel = mongoose.model("Holiday", holidaySchema);
export default holidayModel;
