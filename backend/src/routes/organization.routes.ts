import { Router } from 'express';
import { authenticate, requireOrgMembership, requireOrgRole } from '../middleware/auth.middleware';
import { upload } from '../config/cloudinary';
import * as orgController from '../controllers/organization.controller';

const router = Router();
router.use(authenticate);

router.get('/', orgController.getOrganizations);
router.post('/', orgController.createOrganization);
router.get('/:id', requireOrgMembership, orgController.getOrganization);
router.put('/:id', requireOrgMembership, requireOrgRole('ORG_ADMIN' as any, 'SUPER_ADMIN' as any), orgController.updateOrganization);
router.delete('/:id', orgController.deleteOrganization);
router.post('/:id/logo', requireOrgMembership, requireOrgRole('ORG_ADMIN' as any), upload.single('logo'), orgController.uploadLogo);
router.get('/:id/members', requireOrgMembership, orgController.getMembers);
router.patch('/:id/members/:userId/role', requireOrgMembership, requireOrgRole('ORG_ADMIN' as any), orgController.updateMemberRole);
router.delete('/:id/members/:userId', requireOrgMembership, requireOrgRole('ORG_ADMIN' as any), orgController.removeMember);

export default router;