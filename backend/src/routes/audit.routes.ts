import { Router } from 'express';
import { authenticate, requireOrgMembership, requireOrgRole } from '../middleware/auth.middleware';
import * as miscController from '../controllers/misc.controller';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);
router.use(requireOrgMembership);
router.use(requireOrgRole(Role.ORG_ADMIN, Role.SUPER_ADMIN));

router.get('/', miscController.getAuditLogs);

export default router;
