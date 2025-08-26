import DailyReportModel from "../models/dailyReportModel.js";


export const addDailyReport = async (req, res) => {
  try {
    const { date, taskGiven, taskGivenBy, concernedDepartment, objective, remark, status } = req.body;

    if (!date || !taskGiven || !taskGivenBy || !concernedDepartment || !objective) {
      return res.status(400).json({
        success: false,
        message: "date, taskGiven, taskGivenBy, concernedDepartment, and objective are required"
      });
    }

    const reportDate = new Date(date).setHours(0, 0, 0, 0); // Normalize to start of day

    // Check if report for this date already exists for this user
    let dailyReport = await DailyReportModel.findOne({
      userId: req.user._id,
      date: reportDate
    });

    if (dailyReport) {
      // Add new task in existing report
      dailyReport.reports.push({
        taskGiven,
        taskGivenBy,
        concernedDepartment,
        objective,
        remark,
        status
      });
      await dailyReport.save();

      return res.status(200).json({
        success: true,
        message: "Task added to existing daily report",
        dailyReport
      });
    } else {
      // Create new daily report document
      dailyReport = await DailyReportModel.create({
        userId: req.user._id,
        date: reportDate,
        reports: [{
          taskGiven,
          taskGivenBy,
          concernedDepartment,
          objective,
          remark,
          status
        }]
      });

      return res.status(201).json({
        success: true,
        message: "New daily report created",
        dailyReport
      });
    }

  } catch (error) {
    console.error("Error adding daily report:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding daily report",
      error: error.message
    });
  }
}; 


export const getAllReports = async (req, res) => {
  try {
    const { userId, fromDate, toDate, department, status } = req.query;

    let filter = {};
    if (userId) filter.userId = userId;
    if (fromDate && toDate) {
      filter.date = {
        $gte: new Date(fromDate).setHours(0, 0, 0, 0),
        $lte: new Date(toDate).setHours(23, 59, 59, 999)
      };
    }

    const reports = await DailyReportModel.find(filter)
      .populate("userId", "name email role")
      .sort({ date: -1 });

    // If department or status filter is applied, filter nested tasks
    let filteredReports = reports;
    if (department || status) {
      filteredReports = reports.map(report => {
        const filteredTasks = report.reports.filter(task =>
          (!department || task.concernedDepartment === department) &&
          (!status || task.status === status)
        );
        return { ...report._doc, reports: filteredTasks };
      }).filter(r => r.reports.length > 0);
    }

    res.status(200).json({
      success: true,
      totalReports: filteredReports.length,
      reports: filteredReports
    });

  } catch (error) {
    console.error("Error fetching all reports:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching reports",
      error: error.message
    });
  }
};

export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await DailyReportModel.findById(id).populate("userId", "name email role");
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found"
      });
    }

    res.status(200).json({
      success: true,
      report
    });

  } catch (error) {
    console.error("Error fetching report by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching report",
      error: error.message
    });
  }
};

export const getMyReports = async (req, res) => {
  try {
    console.log("Fetching my reports for user:", req.user._id);
    const reports = await DailyReportModel.find({ userId: req.user._id })
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      totalReports: reports.length,
      reports
    });

  } catch (error) {
    console.error("Error fetching user reports:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching your reports",
      error: error.message
    });
  }
};


