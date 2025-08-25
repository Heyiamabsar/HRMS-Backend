import express from 'express'
import { addDailyReport, getAllReports} from '../controllers/dailyReportsController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';


const dailyReportRouter = express.Router();
dailyReportRouter.use(authenticate)

dailyReportRouter.post('/create', authorizeRoles('admin','hr','employee') , addDailyReport);

dailyReportRouter.get('/all', authorizeRoles('admin','hr') ,getAllReports);


export default dailyReportRouter;
