import mongoose from 'mongoose';

const PayrollSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  },
  User: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  },
  month: { type: String },
  year: { type: Number},  
  
  present: { type: Number},
  absent: { type: Number},
  halfDay: { type: Number},
  unpaid: { type: Number},
  sick: { type: Number},
  overtime: { type: Number},




  basicSalary: { type: Number },
  grossSalary: { type: Number },
  netSalary: { type: Number },
  medicalAllowance: { type: Number },
  travelingAllowance: { type: Number },
  hra: { type: Number },


  totalAllowances: { type: Number },
  totalDeductions: {type: String },
  bonuses: { type: Number },

  paymentMethod: {type: String },
  accountNumber: {type: Number },
  bankName: {type: String },
  ifscCode: {type: String },
  pfDeduction: {type: Number },
  loanDeduction: { type: Number },
  ptDeduction: { type: Number },
  una: {type: Number },
  generatedAt: { type: Date, default: Date.now },

  status: { type: String, enum: ['pending', 'processed', 'paid'], default: 'pending' },
  payDate: { type: Date }

}, { timestamps: true });
90
const payrollModel= mongoose.model('Payroll', PayrollSchema);

export default payrollModel
