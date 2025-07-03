import AttendanceModel from "../models/attendanceModule.js";
import LeaveModel from "../models/leaveModel.js";
import userModel from "../models/userModel.js";
import moment from "moment-timezone";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import payrollModel from "../models/payrollModel.js";


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
      reportMap.set(emp?._id?.toString(), {
        name: `${emp.first_name} ${emp.last_name}`,
        email: emp.email,
        role: emp.role,
        salary: emp.salary || 0,
        salaryPerDay: (emp.salary || 0) / 30,
        joiningDate: emp?.joining_date ? moment(emp?.joining_date).format('YYYY-MM-DD') : 0,
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
          emp.inOutTimes[date] = 0;
        } else {
          const status = record.status?.toLowerCase();
          if (status === 'present') emp.present++;
          else if (status === 'half day') emp.halfDay++;
          emp.inOutTimes[date] = `${record.inTime || 0} - ${record.outTime || 0}`;
        }
      });
    }

    leaveRecords.forEach(lv => {
      const emp = reportMap.get(lv?.userId?.toString());
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

export const getAllUsersAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { _id } = req.user;

    const user = await userModel.findById(_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const formattedStart = moment.tz(startDate, user.timeZone).format("YYYY-MM-DD");
    const formattedEnd = moment.tz(endDate, user.timeZone).format("YYYY-MM-DD");

    const dateRange = [];
    let curr = moment.tz(startDate, user.timeZone).startOf("day");
    const last = moment.tz(endDate, user.timeZone).endOf("day");

    while (curr.isSameOrBefore(last, "day")) {
      dateRange.push(curr.format("YYYY-MM-DD"));
      curr.add(1, "day");
    }

    const records = await AttendanceModel.find({
      date: {
        $gte: formattedStart,
        $lte: formattedEnd,
      },
    }).populate("userId");

    const userMap = new Map();

    records.forEach((record) => {
      const recordUser = record.userId;
      if (!recordUser?._id) return;
      const userKey = recordUser?._id?.toString();

      if (!userMap.has(userKey)) {
        userMap.set(userKey, {
          userId: recordUser._id,
          name: `${recordUser.first_name} ${recordUser.last_name}`,
          email: recordUser.email,
          status: recordUser.status,
          attendance: {},
          presentCount: 0,
          absentCount: 0,
          halfDayCount: 0,
          outOfDays: 0
        });
      }

      const formattedDate = moment(record.date).format("YYYY-MM-DD");
      const userData = userMap.get(userKey);
      userData.attendance[formattedDate] = record.status;

      if (record.status.toLowerCase() === "present") userData.presentCount++;
      if (record.status.toLowerCase() === "absent") userData.absentCount++;
      if (record.status.toLowerCase() === "half day") userData.halfDayCount++;
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Attendance Report");

    const columns = [
      { header: "User ID", key: "userId", width: 25 },
      { header: "Name", key: "name", width: 30 },
      { header: "Email", key: "email", width: 30 },
      { header: "Status", key: "status", width: 15 },
      ...dateRange.map((date) => ({ header: date, key: date, width: 15 })),
      { header: "Total Present", key: "totalPresent", width: 15 },
      { header: "Total Absent", key: "totalAbsent", width: 15 },
      { header: "Total Half Day", key: "totalHalfDay", width: 15 },
      { header: "Out of Days", key: "outOfDays", width: 15 },
    ];

    sheet.columns = columns;

    for (const [, user] of userMap.entries()) {
      const row = {
        userId: user?.userId?.toString(),
        name: user?.name,
        email: user?.email,
        status: user?.status,
      };

      dateRange.forEach((date) => {
        const status = user.attendance[date];
        if (status) {
          row[date] = status;
        } else {
          row[date] = "Absent";
          user.absentCount++;
        }
      });

      row.totalPresent = user.presentCount;
      row.totalAbsent = user.absentCount;
      row.totalHalfDay = user.halfDayCount;
      row.outOfDays = dateRange.length;

      sheet.addRow(row);
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Attendance_Report_${startDate}_to_${endDate}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};


export const getAllUsersPayrollReport = async (req, res) => {
  try {
    const { startDate, endDate, department, location } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "Start date and End date are required" });
    }

    const start = moment(startDate).startOf("day").toDate();
    const end = moment(endDate).endOf("day").toDate();
    const month = moment(startDate).format("MMMM");
    const year = moment(startDate).format("YYYY");

    // Filter users
    let userQuery = { role: { $in: ["employee", "hr"] } };
    if (department) userQuery.department = department;
    if (location) userQuery.location = location;

    const allUsers = await userModel.find(userQuery);

    // Payroll records
    const payrolls = await payrollModel.find({ payDate: { $gte: start, $lte: end } });
    const payrollMap = {};
    payrolls.forEach(p => payrollMap[p?.userId?.toString()] = p);

    // Leave records
    const leaveRecords = await LeaveModel.find({
      fromDate: { $lte: end },
      toDate: { $gte: start }
    });
    const leaveMap = {};
    leaveRecords.forEach(lv => {
      const id = lv?.userId?.toString();
      if (!leaveMap[id]) leaveMap[id] = { sick: 0, casual: 0, unpaid: 0, total: 0 };

      const from = moment.max(moment(lv.fromDate), moment(start));
      const to = moment.min(moment(lv.toDate), moment(end));
      let days = to.diff(from, "days") + 1;
      if (lv.leaveType === "half day") days = 0.5;

      if (lv.leaveType === "sick") leaveMap[id].sick += days;
      else if (lv.leaveType === "casual") leaveMap[id].casual += days;
      else if (lv.leaveType === "unpaid") leaveMap[id].unpaid += days;
      else leaveMap[id].casual += days;

      leaveMap[id].total += days;
    });

    // Attendance - calculate overtime in hours
    const attendance = await AttendanceModel.find({
      status: "Over Time",
      date: { $gte: start, $lte: end }
    });
    const overtimeMap = {};
    attendance.forEach(a => {
      if (!a.inTime || !a.outTime) return;
      const id = a?.userId?.toString();
      const hours = moment(a.outTime).diff(moment(a.inTime), 'hours', true);
      if (!overtimeMap[id]) overtimeMap[id] = 0;
      overtimeMap[id] += hours;
    });

    // Excel generation
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Payroll Report");

      sheet.columns = [
      { header: "name", key: "name", width: 25 },
      { header: "email", key: "email", width: 30 },
      { header: "department", key: "department", width: 15 },
      { header: "location", key: "location", width: 15 },
      { header: "joiningDate", key: "joiningDate", width: 15 },
      { header: "month", key: "month", width: 10 },
      { header: "year", key: "year", width: 10 },
      { header: "salary", key: "salary", width: 15 },
      { header: "basicSalary", key: "basicSalary", width: 15 },
      { header: "hra", key: "hra", width: 15 },
      { header: "medicalAllowance", key: "medicalAllowance", width: 15 },
      { header: "travelingAllowance", key: "travelingAllowance", width: 15 },
      { header: "bonuses", key: "bonuses", width: 12 },
      { header: "overtime", key: "overtime", width: 15 },
      { header: "loanDeduction", key: "loanDeduction", width: 15 },
      { header: "ptDeduction", key: "ptDeduction", width: 15 },
      { header: "pfDeduction", key: "pfDeduction", width: 12 },
      { header: "una", key: "una", width: 12 },
      { header: "paymentMethod", key: "paymentMethod", width: 18 },
      { header: "accountNumber", key: "accountNumber", width: 20 },
      { header: "bankName", key: "bankName", width: 20 },
      { header: "sickLeave", key: "sickLeave", width: 12 },
      { header: "casualLeave", key: "casualLeave", width: 12 },
      { header: "unpaidLeave", key: "unpaidLeave", width: 12 },
      { header: "totalLeaves", key: "totalLeaves", width: 12 },
      { header: "totalDeductions", key: "totalDeductions", width: 18 },
      { header: "status", key: "status", width: 15 },
      { header: "payDate", key: "payDate", width: 18 },
      { header: "payRollId", key: "payrollId", width: 18 },
      { header: "grossSalary", key: "grossSalary", width: 18 },
      { header: "netSalary", key: "netSalary", width: 15 },
    ];


    allUsers.forEach(user => {
      console.log("user",user)
      const id = user?._id?.toString();
      const p = payrollMap[id];
      const lv = leaveMap[id] || {};
      const overtime = overtimeMap[id]?.toFixed(2) || 0;

      sheet.addRow({
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        email: user.email || '',
        department: user.department || '',
        location: user.location || '',
        joiningDate: user.joining_date ? moment(user.joining_date).format("YYYY-MM-DD") : '',
        month,
        year,
        basicSalary: p?.basicSalary || 0,
        salary: user?.salary ?? 0,
        hra: p?.hra ?? 0,
        medicalAllowance: p?.medicalAllowance ?? 0,
        travelingAllowance: p?.travelingAllowance ?? 0,
        grossSalary: p?.grossSalary ?? 0,
        bonuses: p?.bonuses ?? 0,
        overtime,
        loanDeduction: p?.loanDeduction ?? 0,
        ptDeduction: p?.ptDeduction ?? 0,
        pfDeduction: p?.pfDeduction ?? 0,
        una: p?.una ?? 0,
        totalDeductions: p?.totalDeductions ?? 0,
        netSalary: p?.netSalary ?? 0,
        paymentMethod: p?.paymentMethod || 'Bank Transfer',
        accountNumber: p?.accountNumber ?? 0,
        bankName: p?.bankName ?? '',
        sickLeave: lv.sick,
        casualLeave: lv.casual,
        unpaidLeave: lv.unpaid,
        totalLeaves: lv.total,
        payrollId: p?._id?.toString() ?? '',
        status: p?.status ?? 'Pending',
        payDate: p?.payDate ? moment(p.payDate).format("YYYY-MM-DD") : ''
      });
    });
    console.log("payrollMap",payrollMap)

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Payroll_Report_${startDate}_to_${endDate}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Payroll report error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};


export const getAllUsersLeaveReport = async (req, res) => {
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

    const formattedStart = moment.tz(startDate, user.timeZone).startOf('day').toDate();
    const formattedEnd = moment.tz(endDate, user.timeZone).endOf('day').toDate();

    const leaves = await LeaveModel.find({
      fromDate: { $lte: formattedEnd },
      toDate: { $gte: formattedStart }
    }).populate('userId');

    const leaveMap = new Map();

    leaves.forEach((leave) => {
      const recordUser = leave.userId;
      if (!recordUser?._id) return;

      const userKey = recordUser?._id?.toString();

      if (!leaveMap.has(userKey)) {
        leaveMap.set(userKey, {
          // userId: recordUser._id,
          name: `${recordUser.first_name} ${recordUser.last_name}`,
          email: recordUser.email,
          status: recordUser.status,
          sickLeave: 0,
          unPaidLeave: 0,
          leaveBalance: leave.leaveBalance || 0,
          leaves: [],
        });
      }

      const totalDays = moment(leave.toDate).diff(moment(leave.fromDate), 'days') + 1;

      // Aggregate leave counts
      leaveMap.get(userKey).sickLeave += leave.sickLeave || 0;
      leaveMap.get(userKey).unPaidLeave += leave.unPaidLeave || 0;

      leaveMap.get(userKey).leaves.push({
        reason: leave.reason,
        fromDate: moment(leave.fromDate).format("YYYY-MM-DD"),
        toDate: moment(leave.toDate).format("YYYY-MM-DD"),
        leaveType: leave.leaveType,
        status: leave.status,
        appliedAt: moment(leave.appliedAt).format("YYYY-MM-DD"),
        totalDays
      });
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Leave Report');

    sheet.columns = [
      // { header: 'User ID', key: 'userId', width: 25 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Leave Type', key: 'leaveType', width: 15 },
      { header: 'Reason', key: 'reason', width: 30 },
      { header: 'From Date', key: 'fromDate', width: 15 },
      { header: 'To Date', key: 'toDate', width: 15 },
      { header: 'Total Days', key: 'totalDays', width: 15 },
      { header: 'Leave Status', key: 'leaveStatus', width: 15 },
      { header: 'Applied At', key: 'appliedAt', width: 20 },
      { header: 'Sick Leave Taken', key: 'sickLeave', width: 15 },
      { header: 'Unpaid Leave Taken', key: 'unPaidLeave', width: 15 },
      { header: 'Leave Balance', key: 'leaveBalance', width: 15 },
    ];

    for (const [, user] of leaveMap.entries()) {
      user.leaves.forEach((lv) => {
        sheet.addRow({
          // userId: user.userId.toString(),
          name: user.name,
          email: user.email,
          status: user.status,
          leaveType: lv.leaveType,
          reason: lv.reason,
          fromDate: lv.fromDate,
          toDate: lv.toDate,
          totalDays: lv.totalDays,
          leaveStatus: lv.status,
          appliedAt: lv.appliedAt,
          sickLeave: user.sickLeave,
          unPaidLeave: user.unPaidLeave,
          leaveBalance: user.leaveBalance,
        });
      });
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Leave_Report_${startDate}_to_${endDate}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message,
    });
  }
};
