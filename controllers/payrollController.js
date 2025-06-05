import { exportUserToExcel, getExcelData, loadAllUserToExcel } from "../middleware/payroll.js"
import _ from 'lodash'; 


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