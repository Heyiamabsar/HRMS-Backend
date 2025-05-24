// routes/holidayRoutes.js
import express from "express";
import { addCustomHoliday, deleteHoliday, getAllHolidays, getMonthlyHolidays, updateHoliday } from "../controllers/holidayController.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";


const holidayRouter = express.Router();
holidayRouter.use(authenticate);


holidayRouter.get("/monthly_holidays",authorizeRoles('admin', 'hr', 'employee'), getMonthlyHolidays);
holidayRouter.get("/all_holidays",authorizeRoles('admin', 'hr', 'employee'), getAllHolidays);

// Admin and HR APIs
holidayRouter.post("/add_custom_holiday",authorizeRoles('admin', 'hr'), addCustomHoliday);
holidayRouter.put("/edit_holiday/:id",authorizeRoles('admin', 'hr'), updateHoliday);
holidayRouter.delete("/delete_holiday/:id",authorizeRoles('admin', 'hr'), deleteHoliday);

export default holidayRouter;
