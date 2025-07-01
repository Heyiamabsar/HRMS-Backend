import { exportUserToExcel, getExcelData, loadAllUserToExcel } from "../middleware/payroll.js"
import _ from 'lodash'; 
import payrollModel from "../models/payrollModel.js";
import moment from "moment-timezone";
import userModel from "../models/userModel.js";
import { sendNotification } from "../utils/notificationutils.js";


export const addPayrollBasicInfo = async (req, res) => {
  try {
    const {
      basicSalary,
      medicalAllowance,
      travelingAllowance,
      hra,
      totalAllowances,
      totalDeductions,
      bonuses,
      paymentMethod,
      accountNumber,
      bankName,
      ifscCode,
      pfDeduction,
      loanDeduction,
      ptDeduction,
      una,
      payDate,
      status
    } = req.body;
    const userId = req.params.id;

    const payroll = new payrollModel({
      userId,
      basicSalary,
      medicalAllowance,
      travelingAllowance,
      hra,
      totalAllowances,
      totalDeductions,
      bonuses,
      paymentMethod,
      accountNumber,
      bankName,
      ifscCode,
      pfDeduction,
      loanDeduction,
      ptDeduction,
      una,
      payDate,
      status: status || 'pending'
    });

    await payroll.save();

      const employee = await userModel.findById(userId);

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