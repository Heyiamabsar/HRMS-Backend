import userModel from "../models/userModel.js";


export const exportUserToExcel = async (_id) => {
  const user = await userModel.findById(_id).lean();
  if (!user) return console.log('User not found');

  const worksheet = xlsx.utils.json_to_sheet([user]);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'User');
  xlsx.writeFile(workbook, 'payroll-data.xlsx');

  console.log('Exported to Excel ✅');
};

export const updateExcelData = () => {
  const workbook = xlsx.readFile('payroll-data.xlsx');
  const sheet = workbook.Sheets['User'];
  const jsonData = xlsx.utils.sheet_to_json(sheet);

  const updatedData = jsonData.map(user => {
    if (user.status === 'Inactive') {
      user.status = 'Active';
    }
    return user;
  });
  const updatedSheet = xlsx.utils.json_to_sheet(updatedData);
  workbook.Sheets['User'] = updatedSheet;
  xlsx.writeFile(workbook, 'payroll-data.xlsx');

  console.log('Excel Updated ✅');
};

// await exportUserToExcel(userId);  // Step 1: Export
// updateExcelData();    