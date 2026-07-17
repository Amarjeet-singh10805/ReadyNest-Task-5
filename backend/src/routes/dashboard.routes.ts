import { Router } from 'express';
import { authenticate, requireOrgMembership } from '../middleware/auth.middleware';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();
router.use(authenticate);
router.use(requireOrgMembership);

router.get('/stats', dashboardController.getDashboardStats);
router.get('/my-tasks', dashboardController.getMyTasks);

export default router;
