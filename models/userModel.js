import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  first_name: {type: String,required: true,trim: true},
  last_name: {type: String,trim: true},
  phone: {type: Number, required: true,trim: true},
  email: { type: String, unique: true, trim: true},
  password: { type: String, required: true },
  department: {type: String, required: true},
  userId: {type: String, required: true},
    uploads: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Upload'
  }],
  address: {
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    village: { type: String, required: true },
    address_line: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  designation: {type: String,required: true },
  joining_date: {type: Date,required: true},
  salary: {type: Number,required: true},
  status: {type: String,enum: ['active', 'inactive'],default: 'inactive' },
  role: { type: String, enum: ['admin', 'hr', 'employee'], default: 'employee' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });


userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // Only hash if password is new/modified

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

const userModel = mongoose.model('User', userSchema);

export default userModel;
