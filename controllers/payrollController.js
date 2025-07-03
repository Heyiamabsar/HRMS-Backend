import { exportUserToExcel, getExcelData, loadAllUserToExcel } from "../middleware/payroll.js"
import _ from 'lodash'; 
import xlsx from 'xlsx';
import axios from 'axios';
import mongoose from 'mongoose';
import payrollModel from "../models/payrollModel.js";
import moment from "moment-timezone";
import userModel from "../models/userModel.js";
import { sendNotification } from "../utils/notificationutils.js";


export const addPayrollBasicInfo = async (req, res) => {
  try {
    const {
      month,
      year,
      conveyanceAllowance,
      specialAllowance,
      UNA,
      totalDays,
      workedDays,
      holidayPayout,
      TDS,
      basicSalary,
      medicalAllowance,
      travelingAllowance,
      hra,
      totalAllowances,
      totalDeductions,
      bonuses,
      paymentMethod,
      pfDeduction,
      loanDeduction,
      ptDeduction,
      payDate,
      grossSalary,
      netSalary,
      status
    } = req.body;
    const userId = req.params.id;

    const employee = await userModel.findById(userId);
      if (!employee) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

     const existing = await payrollModel.findOne({ userId, month, year });
      if (existing) {
      return res.status(400).json({ success: false, message: "Salary slip already exists for this user in this month & year." });
    }

    const payroll = new payrollModel({
      userId,
      month,
      year,
      conveyanceAllowance,
      specialAllowance,
      UNA,
      totalDays,
      workedDays,
      holidayPayout,
      TDS,
      basicSalary,
      medicalAllowance,
      travelingAllowance,
      hra,
      totalAllowances,
      totalDeductions,
      bonuses,
      paymentMethod,
      pfDeduction,
      loanDeduction,
      ptDeduction,
      grossSalary,
      netSalary,
      payDate:payDate || null,
      status: status || 'pending'
    });

    await payroll.save();



    await sendNotification({
      userId: employee._id,
      title: "Payroll Generated",
      message: `Your payroll for ${payDate} has been generated.`,
      link: `/user/payroll/${payroll._id}`,
      type: "admin",
      performedBy: req.user._id
    });


    await sendNotification({
      forRoles: ["admin", "hr"],
      title: "Payroll Created",
      message: `${req.user.name} created payroll for ${employee.name}`,
      link: `/admin/payroll/${payroll._id}`,
      type: "admin",
      performedBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: "Payroll created successfully",
      data: payroll
    });

  } catch (error) {
    console.error("Payroll creation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// controllers/payrollController.js
export const updatePayrollBasicInfo = async (req, res) => {
  try {
    const userId = req.params.id;
    const {
      month,
      year,
      adminPermission,
      conveyanceAllowance,
      specialAllowance,
      UNA,
      totalDays,
      workedDays,
      holidayPayout,
      TDS,
      basicSalary,
      medicalAllowance,
      travelingAllowance,
      hra,
      totalAllowances,
      totalDeductions,
      bonuses,
      paymentMethod,
      pfDeduction,
      loanDeduction,
      ptDeduction,
      payDate,
      grossSalary,
      netSalary,
      status
    } = req.body;

    const payroll = await payrollModel.findOneAndUpdate(
      { userId, month, year },
      {
        $set: {
          basicSalary,
          adminPermission,
          medicalAllowance,
          travelingAllowance,
          conveyanceAllowance,
          specialAllowance,
          UNA,
          totalDays,
          workedDays,
          holidayPayout,
          TDS,
          hra,
          totalAllowances,
          totalDeductions,
          bonuses,
          paymentMethod,
          pfDeduction,
          loanDeduction,
          ptDeduction,
          grossSalary,
          netSalary,
          payDate,
          status
        }
      },
      { new: true }
    );

    if (!payroll) {
      return res.status(404).json({ success: false, message: "Payroll not found for this user and date." });
    }

    const employee = await userModel.findById(userId);

    // Notify employee about update
    await sendNotification({
      userId: employee._id,
      title: "Payroll Updated",
      message: `Your payroll for ${payDate} has been updated.`,
      link: `/user/payroll/${payroll._id}`,
      type: "admin",
      performedBy: req.user._id
    });

    // Notify admins/HR
    await sendNotification({
      forRoles: ["admin", "hr"],
      title: "Payroll Updated",
      message: `${req.user.name} updated payroll for ${employee.name}`,
      link: `/admin/payroll/${payroll._id}`,
      type: "admin",
      performedBy: req.user._id
    });

    res.status(200).json({
      success: true,
      message: "Payroll updated successfully",
      data: payroll
    });

  } catch (error) {
    console.error("Payroll update error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};



export const fetchPayrollDataFromExcel = async (req, res) => {
  try {

    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const response = await axios.get(req.file.path, { responseType: 'arraybuffer' });
    const workbook = xlsx.read(response.data, { type: 'buffer' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ success: false, message: 'No sheets found in uploaded Excel file' });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    const results = [];
    for (const item of data) {
      if (!item.email) {
        results.push({ ...item, error: 'Missing email', matchedUser: false, recordStatus: 'skipped' });
        continue;
      }

let payDate = null;

    if (item.payDate) {
      if (typeof item.payDate === 'number') {
        payDate = moment.utc("1899-12-30").add(item.payDate, 'days').toDate();
      } else {
        const parsed = moment.tz(item.payDate, ["YYYY-MM-DD", "DD-MM-YYYY", "MM/DD/YYYY"], true, "Asia/Kolkata");
        if (parsed.isValid()) {
          payDate = parsed.toDate();
        } else {
          // Invalid format — ignore payDate but don’t skip row
          payDate = null;
        }
      }
    }


      // Parse numeric fields
      const toNullableNumber = (val) => {
      if (val === '' || val === null || typeof val === 'undefined') return 0;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

      const numericFields = [
        "grossSalary", "netSalary", "basicSalary", "hra", "medicalAllowance",
        "travelingAllowance", "loanDeduction", "bonuses", "ptDeduction", "pfDeduction",
        "una", "totalAllowances", "totalDeductions", "sickLeave", "casualLeave",
        "unpaidLeave", "totalLeaves", "salary", "overtime"
      ];
      for (const field of numericFields) {
        item[field] = toNullableNumber(item[field]);
      }

      // Try to match user
      const user = await userModel.findOne({ email: item.email });
      if (!user) {
        results.push({ ...item, payDate, matchedUser: false, recordStatus: 'skipped' });
        continue;
      }

      // Handle payroll record
      const existing = payDate ?  await payrollModel.findOne({ userId: user._id, payDate }) : null;

      const userSummary = {
        _id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
        salary: user.salary,
        month: user.month ,
        year: user.year ,
        role: user.role
      };

      if (existing) {
        if (['processed', 'paid'].includes(existing.status)) {
          results.push({
            ...existing.toObject(),
            user: userSummary,
            matchedUser: true,
            recordStatus: 'existing'
          });
        } else {
          const updated = await payrollModel.findOneAndUpdate(
            { _id: existing._id },
            { ...item, userId: user._id, payDate, status: 'pending' },
            { new: true }
          );
          results.push({
            ...updated.toObject(),
            user: userSummary,
            matchedUser: true,
            recordStatus: 'updated'
          });
        }
      } else {
        const created = await payrollModel.create({
          ...item,
          userId: user._id,
          payDate,
          status: 'pending',
        });
        results.push({
          ...created.toObject(),
          user: userSummary,
          matchedUser: true,
          recordStatus: 'created'
        });
      }
    }
    console.log("results",results)

    res.status(200).json({
      success: true,
      message: 'Excel processed successfully',
      totalRows: data.length,
      processed: results.length,
      data: results,
    });

  } catch (error) {
    console.error('Excel Upload Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload Excel',
      error: error.message,
    });
  }
};



// old ends points-----

export const exportAllUsersToExcel = async (req, res) => {
  try {
    const result =await loadAllUserToExcel()
        return res.status(200).json({
        success: true,
        message: 'All User Loaded to Excel and Excel file created on Desktop successfully',
        });



  } catch (error) {
    console.error('Error exporting users to Excel:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const sendUserDataToExcel=async(req,res)=>{
    try {
        const {id}=req.params
        if(!id){
          return res.status(400).json({
                success:false,
                statusCode:400,
                message:'User Id Not Found'
            })
        }

        exportUserToExcel(id)
        return res.status(200).json({
                success:true,
                statusCode:200,
                message:'user details send to Excel'
            })

    } catch (error) {
          return res.status(500).json({
                success:false,
                statusCode:500,
                message:error.message
            })
    }
}

export const getExcelDataById=async(req,res)=>{
try {
    const { id } = req.params; 
      const data = getExcelData();
      console.log("_id",id)
      console.log('data from excel',data)

    const user = data.find((item) => item._id === id);

    if (!user) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'User not found in Excel',
      });
    }
   console.log('data from excel',data)
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'User details fetched by _id from Excel',
      user,
    });


} catch (error) {
    return res.status(500).json({
        success:false,
        statusCode:500,
        message:error.message
    })
}
}