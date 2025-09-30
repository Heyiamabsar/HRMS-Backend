import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  User: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Leave', 'Half Day', 'Weekend', 'Over Time', 'Holiday'],
    default: 'Absent'
  },
 location: {
  type: {
    checkIn: {
      latitude: Number,
      longitude: Number,
      address: Object,
      displayName: String,
      punchedFrom: String,
    },
    checkOut: {
      latitude: Number,
      longitude: Number,
      address: Object,
      displayName: String,
      punchedFrom: String,
    }
  },
  default: { checkIn: {}, checkOut: {} }
},
  userName: { type: String },
  userEmail: { type: String }

}, { timestamps: true });

attendanceSchema.index({ userName: "text", userEmail: "text" });
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

const AttendanceModel = mongoose.model('Attendance', attendanceSchema);

export default AttendanceModel;
