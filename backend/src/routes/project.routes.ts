import { Router } from 'express';
import { authenticate, requireOrgMembership } from '../middleware/auth.middleware';
import * as projectController from '../controllers/project.controller';

const router = Router();
router.use(authenticate);
router.use(requireOrgMembership);

router.get('/', projectController.getProjects);
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.patch('/:id/archive', projectController.archiveProject);

export default router;
