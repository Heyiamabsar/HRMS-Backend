// controllers/holidayController.js

import moment from "moment";
import holidayModel from "../models/holidayModule.js";
import { sendNotification } from "../utils/notificationutils.js";

//  Add custom holiday
export const addCustomHoliday = async (req, res) => {
  try {
    const { date, reason , isOptional } = req.body;
    if (!date || !reason) return res.status(400).json({success:false ,statusCode:400, message: "Date and reason are required" });
    if (!moment(date, "YYYY-MM-DD", true).isValid()) return res.status(400).json({success:false ,statusCode:400, message: "Invalid date format" });
    if (moment(date).isBefore(moment().startOf("day"))) return res.status(400).json({success:false ,statusCode:400, message: "Cannot add past holidays" });
    // if (moment(date).day() === 0) return res.status(400).json({success:false ,statusCode:400, message: "Cannot add holidays on Sundays" });

    const holidayDate = moment(date).startOf("day");
        
    const existing = await holidayModel.findOne({ date: holidayDate });
    if (existing) return res.status(400).json({success:false ,statusCode:400, message: "Holiday already exists" });
    const holiday = new holidayModel({ date: holidayDate, reason, isCustom: true , isOptional: isOptional || false });
    await holiday.save();

    await sendNotification({
      forRoles: ["admin", "hr"], 
      title: "Custom Holiday Added",
      message: `${req.user.name} added a new custom holiday: ${holiday.reason}`,
      link: `/holiday/${holiday._id}/details`,
      type: "admin",
      performedBy: req.user._id
    });    

    res.status(201).json({ success:true ,statusCode:201, message: "Custom holiday added", holiday });
  } catch (error) {
    res.status(500).json({ success:false ,statusCode:500, message: "Server error", error });
  }
};


//  Edit a custom holiday
export const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, reason , isOptional} = req.body;

    if (!id) return res.status(400).json({success:false , statusCode:400,  message: "Holiday ID is required" });
    if (!date && !reason) return res.status(400).json({success:false , statusCode:400,  message: "Date and reason are required" });

    if (date && !moment(date, "YYYY-MM-DD", true).isValid()) return res.status(400).json({success:false , statusCode:400,   message: "Invalid date format date must be YYYY-MM-DD" });

    if (date) {
      const existing = await holidayModel.findOne({
        date: moment(date).startOf("day"),
        _id: { $ne: id }
      });
       if (existing) return res.status(400).json({success:false , statusCode:400,   message: "Holiday already exists" });
    }

    const holiday = await holidayModel.findById(id);

    if (!holiday) return res.status(404).json({success:false , statusCode:404,   message: "Holiday not found" });
    if (!holiday.isCustom) return res.status(400).json({success:false , statusCode:400,   message: "Cannot edit default (Sunday) holidays" });

    holiday.date = date;
    holiday.reason = reason;
    if (typeof isOptional !== "undefined") {
    holiday.isOptional = isOptional;
  }
    await holiday.save();

      await sendNotification({
        forRoles: ["admin", "hr"],
        title: "Custom Holiday Updated",
        message: `${req.user.name} updated a custom holiday: ${holiday.reason}`,
        link: `/holiday/${holiday._id}/details`,
        type: "admin",
        performedBy: req.user._id
      });

    res.status(200).json({success:true , statusCode:200,   message: "Holiday updated", holiday });
  } catch (error) {
    res.status(500).json({success:false , statusCode:500,   message: "Server error", error: error.message });
  }
};

//  Get all holidays in a month
export const getMonthlyHolidays = async (req, res) => {
  try {
    const { month, year } = req.query;
    console.log('month', month, 'year', year);
    if (!month || !year) return res.status(400).json({success:false ,statusCode:400, message: "Month and year are required" });
    if (isNaN(month) || isNaN(year)) return res.status(400).json({success:false ,statusCode:400, message: "Invalid month or year" });
    if (month < 1 || month > 12) return res.status(400).json({success:false ,statusCode:400, message: "Month must be between 1 and 12" });
    if (year < 2000 || year > 2100) return res.status(400).json({success:false ,statusCode:400, message: "Year must be between 2000 and 2100" });

    const start = moment().year(year).month(month - 1).startOf("month");
    const end = moment(start).endOf("month");

    // Find Sundays
    const sundays = [];
    let date = moment(start);
    while (date <= end) {
      if (date.day() === 0) { // Sunday
        sundays.push(date.clone().startOf("day").toDate());
      }
      date.add(1, 'day');
    }

    // Get custom holidays from DB
    const customHolidays = await holidayModel.find({
      date: { $gte: start.toDate(), $lte: end.toDate() }
    });

    // Merge both
    const allHolidays = [
      ...sundays.map(date => ({ date, reason: "Sunday", isCustom: false })),
      ...customHolidays.map(h => ({ date: h.date, reason: h.reason, isCustom: true }))
    ];

    // Remove duplicates (in case Sunday + custom on same day)
    const unique = Array.from(
      new Map(allHolidays.map(h => [h.date.toISOString(), h])).values()
    );

    res.status(200).json({success:true , statusCode:200, message: "Holidays fetched successfully", data: unique.sort((a, b) => new Date(a.date) - new Date(b.date))});
  } catch (error) {
    res.status(500).json({success:false , statusCode:500,  message: "Server error", error });
  }
};
//  Get all holidays
export const getAllHolidays = async (req, res) => {
  try {
    const holidays = await holidayModel.find().sort({ date: 1 });
    if (!holidays || holidays.length === 0) return res.status(404).json({success:false , statusCode:404, message: "No holidays found" });

    res.status(200).json({success:true , statusCode:200, message: "Holidays fetched successfully", data: holidays});
  } catch (error) {
    res.status(500).json({success:false , statusCode:500,  message: "Server error", error });
  }
};


//  Delete a custom holiday
export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await holidayModel.findById(id);
    if (!holiday) return res.status(404).json({success:false , statusCode:404,  message: "Holiday not found" });
    if (!holiday.isCustom) return res.status(400).json({success:false , statusCode:400,  message: "Cannot delete default (Sunday) holidays" });

    await holiday.deleteOne();
    res.status(200).json({success:true , statusCode:200,   message: "Holiday deleted" });
  } catch (error) {
    res.status(500).json({success:false , statusCode:500,   message: "Server error", error });
  }
};







