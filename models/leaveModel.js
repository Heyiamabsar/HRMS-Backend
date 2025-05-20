
import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,

  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String, required: true },
  maximumLeave: { type: Number, required: true ,default: 20 },
  leaveTaken: { type: Number, required: true, default: 0 },
  leaveBalance: { type: Number, required: true  , default: 20 },
  leaveType: { type: String, enum: ['vacation', 'sick', 'casual', 'paid', 'LOP'], required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },



  appliedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Leave', leaveSchema);
