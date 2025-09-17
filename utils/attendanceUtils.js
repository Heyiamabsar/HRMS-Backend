// utils/attendanceUtils.js
import moment from 'moment';
import AttendanceModel from '../models/attendanceModule.js';

export const formatAttendanceRecord =async (record) => {
  const userId = record.userId;
  const date = moment().format('YYYY-MM-DD');
  const inTime = record.inTime ? moment(record.inTime) : null;
  const outTime = record.outTime ? moment(record.outTime) : null;
  const cutoffTime = moment(record.date).hour(9).minute(15); // 9:15 AM

    const attendance = await AttendanceModel.findOne({ userId, date });
  let duration = null;
  let status = 'Absent';

  if (inTime && outTime) {
    const diff = moment.duration(outTime.diff(inTime));
    const hours = diff.asHours();
    const outTime = attendance.outTime ? moment(attendance.outTime) : null;

    if (inTime.isSameOrBefore(nineFifteen)) {
      todayStatus = 'Present';
    } else if (outTime) {
      const duration = moment.duration(outTime.diff(inTime)).asHours();
      if (duration < 9) {
        // todayStatus = 'Half Day';
        todayStatus = "Present";
                }
              } else {
                // todayStatus = 'Half Day';
                todayStatus = "Present";
              } 

    // if (hours >= 9 && inTime.isSameOrBefore(cutoffTime)) {
    //   status = 'Present';
    // } else if (hours >= 5) {
    //   status = 'Half Day';
    // }
  }

  return {
    date: moment(record.date).format('YYYY-MM-DD'),
    inTime: inTime ? inTime.format('hh:mm A') : null,
    outTime: outTime ? outTime.format('hh:mm A') : null,
    duration,
    status
  };
};
