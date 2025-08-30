import express from 'express'
import { addDailyReport, deleteDailyReportTask, getAllReports, getMyReports, getReportById, updateDailyReport, updateTaskStatus} from '../controllers/dailyReportsController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';


const dailyReportRouter = express.Router();
dailyReportRouter.use(authenticate)

dailyReportRouter.post('/create', authorizeRoles('superAdmin','admin','hr','employee') , addDailyReport);
dailyReportRouter.get('/all', authorizeRoles('superAdmin','admin','hr') ,getAllReports);

dailyReportRouter.put('/update-task/:reportId/:taskId', authorizeRoles('superAdmin','admin','hr','employee') ,updateTaskStatus);
dailyReportRouter.put('/update_report/:reportId/:taskIndex', authorizeRoles('superAdmin','admin','hr','employee') ,updateDailyReport);

dailyReportRouter.delete('/delete_task/:reportId/:taskIndex', authorizeRoles('superAdmin','admin','hr','employee') ,deleteDailyReportTask);
dailyReportRouter.get('/my_reports', authorizeRoles('superAdmin','admin','hr','employee') ,getMyReports);
dailyReportRouter.get('/:id', authorizeRoles('superAdmin','admin','hr') ,getReportById);


export default dailyReportRouter;
