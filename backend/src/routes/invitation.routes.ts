import { Router } from 'express';
import { authenticate, requireOrgMembership } from '../middleware/auth.middleware';
import * as invitationController from '../controllers/invitation.controller';

const router = Router();

router.post('/accept', invitationController.acceptInvitation);
router.use(authenticate);
router.use(requireOrgMembership);

router.get('/', invitationController.getInvitations);
router.post('/', invitationController.sendInvitation);
router.post('/:id/resend', invitationController.resendInvitation);
router.delete('/:id', invitationController.cancelInvitation);

export default router;
