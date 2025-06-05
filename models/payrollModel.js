import mongoose from 'mongoose';

const PayrollSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  },
  User: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  },
  month: { type: String },
  year: { type: Number},   
  basicSalary: { type: Number },
  totalDeductions: { type: Number, },
  grossSalary: { type: Number},
  netSalary: { type: Number }, 
  medicalAllowance: { type: Number }, 
  travelingAllowance: { type: Number }, 
  hra: { type: Number }, 

  allowances: { type: Number },
  deductions: {type: String },
  bonuses: { type: Number },

  paymentMethod: {type: String },
  accountNumber: {type: Number },
  bankName: {type: String },
  
  pf: {type: Number },
  pt: {type: Number },
  pt: {type: Number },
  una: {type: Number },



  status: { type: String, enum: ['pending', 'processed', 'paid'], default: 'pending' },
  payDate: { type: Date }

}, { timestamps: true });
90
const payrollModel= mongoose.model('Payroll', PayrollSchema);

export default payrollModel
