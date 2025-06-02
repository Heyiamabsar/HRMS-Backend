
import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'

  },
  Attendance:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance'

  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String, required: true },
  leaveType: { type: String, enum: ['vacation', 'sick', 'casual', 'LOP'], required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },

  maximumLeave: { type: Number, required: true ,default: 14 },
  leaveTaken: { type: Number, required: true, default: 0 },
  leaveBalance: { type: Number, required: true  , default: 14 },

  appliedAt: { type: Date, default: Date.now },
}, { timestamps: true });

 const LeaveModel = mongoose.model('Leave', leaveSchema);

export default LeaveModel;
