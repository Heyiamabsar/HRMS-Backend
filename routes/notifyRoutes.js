import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { dismissAllNotification, dismissNotification, getNotifications, markAllNotificationAsRead, markNotificationAsRead } from '../controllers/notifyController.js';

const notificationRouter = express.Router();

notificationRouter.use(authenticate);

notificationRouter.put('/mark_as_read/:id', authorizeRoles('admin', 'hr', 'employee'),markNotificationAsRead );
notificationRouter.put('/mark_all_as_read', authorizeRoles('admin', 'hr', 'employee'),markAllNotificationAsRead );
notificationRouter.put('/dismiss_notification/:id', authorizeRoles('admin', 'hr', 'employee'),dismissNotification );
notificationRouter.put('/dismiss_all_notification', authorizeRoles('admin', 'hr', 'employee'),dismissAllNotification );

notificationRouter.get('/', authorizeRoles('admin', 'hr', 'employee'),getNotifications );

export default notificationRouter;