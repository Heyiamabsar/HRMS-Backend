import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  branchName: { type: String, required: true },
  country: { type: String, required: true },
  branchCode: { type: String, required: true, unique: true },
  associatedUsers: { type: Number, default: 0 },
  address: { type: String, required: true },
  weekends: { type: [String], default: ["Sunday"] },
  timeZone: { type: String, required: false },
}, { timestamps: true });

const branchModel = mongoose.model('Branch', branchSchema)

export default branchModel;
