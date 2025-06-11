import userModel from "../models/userModel.js";
import mongoose from 'mongoose';
import xlsx from 'xlsx';
import fs from 'fs';
import _ from 'lodash'; // npm install lodash
import path from 'path';
import os from 'os';


export const loadAllUserToExcel=async()=>{
      const users = await userModel.find().lean();

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'No users found' });
    }

    // ✅ Pick only required fields
    const selectedFields = ['first_name','last_name', 'email', 'role', 'phone','department','designation','userId','sickLeaves','unpaidLeaves','salary']; // customize as needed
    const filteredUsers = users.map((user) => {
      const picked = _.pick(user, selectedFields);
      // picked._id = String(user._id); // ensure _id is a string
      return picked;
    });

    // ✅ Create Excel sheet
    const worksheet = xlsx.utils.json_to_sheet(filteredUsers);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Users');

    // ✅ Path to Desktop
    const desktopDir = path.join(os.homedir(), 'Desktop');
    const filePath = path.join(desktopDir, 'payroll_data.xlsx');

    xlsx.writeFile(workbook, filePath);

    console.log('Excel file saved on Desktop ✅');



}

export const exportUserToExcel = async (_id) => {
  console.log('id in exportUserToExcel', _id);
  const user = await userModel.findById(_id).lean();
  if (!user) return console.log('User not found');

const filePath = 'payroll-data.xlsx';

  // ✅ Remove unwanted fields
  const filteredUser = _.omit(user, ['password', '__v','uploads','attendance','leaves','address','createdAt','updatedAt']);

  // ✅ Make sure _id is converted to string (optional)
  filteredUser._id = String(filteredUser._id);

  const worksheet = xlsx.utils.json_to_sheet([filteredUser]);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'User');
  xlsx.writeFile(workbook, filePath);

//   if (fs.existsSync(filePath)) {
//   try {
//     fs.renameSync(filePath, `${filePath}.bak`); // Backup bana lo
//   } catch (err) {
//     console.error('File is open or locked. Please close it first.');
//     return;
//   }
// }

  console.log('Exported to Excel ✅');
};

// fetch the excel data 
export const getExcelData = () => {
  try {
    const desktopDir = path.join(os.homedir(), 'Desktop');
    const filePath = path.join(desktopDir, 'payroll_data.xlsx');

    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Users']; // 📝 Make sure this matches the sheet name
    const jsonData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    return jsonData;

  } catch (error) {
    console.log('Error while fetching Excel data:', error.message);
    return [];
  }
};

export const updateExcelData = () => {
  const filePath = 'payroll-data.xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets['User'];
  const jsonData = xlsx.utils.sheet_to_json(sheet);


  // const updatedData = jsonData.map(user => {
  //   if (user.status === 'Inactive') {
  //     user.status = 'Active';
  //   }
  //   return user;
  // });
  // const updatedSheet = xlsx.utils.json_to_sheet(updatedData);
  // workbook.Sheets['User'] = updatedSheet;
  xlsx.writeFile(workbook, filePath);

  console.log('Excel Updated ✅');
};

// await exportUserToExcel(userId);  // Step 1: Export
// updateExcelData();    