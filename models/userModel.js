import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  first_name: {type: String,required: true,trim: true},
  last_name: {type: String,trim: true},
  phone: {type: String, required: false,trim: true},
  email: { type: String, unique: true, trim: true},
  password: { type: String, required: true },
  department: {type: String, required: false},
  address: {
    country: { type: String, required: false },
    state: { type: String, required: false },
    city: { type: String, required: false },
    village: { type: String, required: false },
    address_line: { type: String, required: false },
    pincode: { type: String, required: false }
  },
  designation: {type: String,required: false },
  joining_date: {type: Date,required: false},
  salary: {type: Number,required: false},
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
