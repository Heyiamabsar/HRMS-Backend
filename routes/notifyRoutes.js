import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { dismissNotification, getNotifications, markNotificationAsRead } from '../controllers/notifyController.js';

const notificationRouter = express.Router();

notificationRouter.use(authenticate);

notificationRouter.get('/', authorizeRoles('admin', 'hr', 'employee'),getNotifications );
notificationRouter.put('/mark_as_read/:id', authorizeRoles('admin', 'hr', 'employee'),markNotificationAsRead );
notificationRouter.put('/dismiss_notification/:id', authorizeRoles('admin', 'hr', 'employee'),dismissNotification );


export default notificationRouter;