import express from 'express'
import { addDailyReport, getAllReports, getMyReports, getReportById} from '../controllers/dailyReportsController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';


const dailyReportRouter = express.Router();
dailyReportRouter.use(authenticate)

dailyReportRouter.post('/create', authorizeRoles('admin','hr','employee') , addDailyReport);
dailyReportRouter.get('/all', authorizeRoles('admin','hr') ,getAllReports);

dailyReportRouter.get('/my_reports', authorizeRoles('admin','hr','employee') ,getMyReports);
dailyReportRouter.get('/:id', authorizeRoles('admin','hr') ,getReportById);


export default dailyReportRouter;
