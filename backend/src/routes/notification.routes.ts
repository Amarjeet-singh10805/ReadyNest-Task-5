import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as miscController from '../controllers/misc.controller';

const router = Router();
router.use(authenticate);

router.get('/', miscController.getNotifications);
router.patch('/read-all', miscController.markAllNotificationsRead);
router.patch('/:id/read', miscController.markNotificationRead);
router.delete('/:id', miscController.deleteNotification);

export default router;
