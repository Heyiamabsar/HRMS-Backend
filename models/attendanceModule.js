import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // Store date as 'YYYY-MM-DD'
    required: true
  },
  inTime: {
    type: Date,
  },
  outTime: {
    type: Date,
  },
  duration: {
    type: String, // "HH:mm:ss"
  }
}, { timestamps: true });

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

const AttendanceModel = mongoose.model('Attendance', attendanceSchema);

export default AttendanceModel;
