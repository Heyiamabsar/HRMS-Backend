import { exportUserToExcel } from "../middleware/payroll.js"

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
    } catch (error) {
        
    }
}