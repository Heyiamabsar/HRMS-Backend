import AttendanceModel from "../models/attendanceModule.js";
import LeaveModel from "../models/leaveModel.js";
import userModel from "../models/userModel.js";
import moment from "moment-timezone";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";


export const getOverallEmployeeReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { _id } = req.user;

    const user = await userModel.findById(_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start date and end date are required' });
    }

    const start = moment.tz(startDate, user.timeZone).startOf("day").toDate();
    const end = moment.tz(endDate, user.timeZone).endOf("day").toDate();
    const totalDays = moment(end).diff(moment(start), "days") + 1;

    const allUsers = await userModel.find({ role: { $in: ['employee', 'hr'] } });

    const attendanceRecords = await AttendanceModel.find({
      date: { $gte: startDate, $lte: endDate },
    });

    const leaveRecords = await LeaveModel.find({
      fromDate: { $lte: end },
      toDate: { $gte: start },
    });

    const reportMap = new Map();

    allUsers.forEach(emp => {
      reportMap.set(emp._id.toString(), {
        name: `${emp.first_name} ${emp.last_name}`,
        email: emp.email,
        role: emp.role,
        salary: emp.salary || 0,
        salaryPerDay: (emp.salary || 0) / 30,
        joiningDate: emp?.joining_date ? moment(emp?.joining_date).format('YYYY-MM-DD') : '-',
        present: 0,
        absent: 0,
        halfDay: 0,
        sickLeave: 0,
        unPaidLeave: 0,
        casualLeave: 0,
        totalLeaves: 0,
        inOutTimes: {},
        remarks: emp.remarks || '',
      });
    });

    const dateList = [];
    let current = moment(start);
    while (current.isSameOrBefore(end, 'day')) {
      dateList.push(current.format('YYYY-MM-DD'));
      current.add(1, 'day');
    }

    const attendanceMap = new Map();
    attendanceRecords.forEach(rec => {
      const key = `${rec.userId}_${moment(rec.date).format('YYYY-MM-DD')}`;
      attendanceMap.set(key, rec);
    });

    for (const [id, emp] of reportMap.entries()) {
      dateList.forEach(date => {
        const record = attendanceMap.get(`${id}_${date}`);
        if (!record || record.status?.toLowerCase() === 'absent') {
          emp.absent++;
          emp.inOutTimes[date] = '-';
        } else {
          const status = record.status?.toLowerCase();
          if (status === 'present') emp.present++;
          else if (status === 'half day') emp.halfDay++;
          emp.inOutTimes[date] = `${record.inTime || '-'} - ${record.outTime || '-'}`;
        }
      });
    }

    leaveRecords.forEach(lv => {
      const emp = reportMap.get(lv.userId?.toString());
      if (!emp) return;

      const leaveStart = moment.max(moment(lv.fromDate), moment(start));
      const leaveEnd = moment.min(moment(lv.toDate), moment(end));
      let leaveDays = leaveEnd.diff(leaveStart, 'days') + 1;

      if (lv.leaveType === 'half day') {
        leaveDays = 0.5;
      }

      emp.totalLeaves += leaveDays;

      if (lv.leaveType === 'sick') emp.sickLeave += leaveDays;
      else if (lv.leaveType === 'unpaid') emp.unPaidLeave += leaveDays;
      else if (lv.leaveType === 'casual') emp.casualLeave += leaveDays;
      else emp.casualLeave += leaveDays;
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Overall Employee Report');

    sheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Joining Date', key: 'joiningDate', width: 15 },
      { header: 'Salary', key: 'salary', width: 15 },
      { header: 'Salary Per Day', key: 'salaryPerDay', width: 15 },
      { header: 'Present Days', key: 'present', width: 15 },
      { header: 'Absent Days', key: 'absent', width: 15 },
      { header: 'Half Days', key: 'halfDay', width: 15 },
      { header: 'Sick Leave', key: 'sickLeave', width: 15 },
      { header: 'Unpaid Leave', key: 'unPaidLeave', width: 15 },
      { header: 'Casual Leave', key: 'casualLeave', width: 15 },
      { header: 'Total Leaves', key: 'totalLeaves', width: 15 },
      { header: 'Total Days', key: 'totalDays', width: 15 },
      { header: 'Payable Salary', key: 'payableSalary', width: 18 },
      { header: 'Deductions', key: 'deductions', width: 15 },
      // { header: 'Leave Balance', key: 'leaveBalance', width: 15 },
      { header: 'Remarks', key: 'remarks', width: 25 },
    ];

    for (const [, data] of reportMap.entries()) {
      const deduction = (data.unPaidLeave + data.absent) * data.salaryPerDay + 200;
      const payable = data.salary - deduction;
      sheet.addRow({
        ...data,
        totalDays,
        payableSalary: payable.toFixed(2),
        deductions: deduction.toFixed(2),
        leaveBalance: data.leaveBalance || 0,
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Overall_Report_${startDate}_to_${endDate}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};
