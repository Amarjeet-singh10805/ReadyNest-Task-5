import { Router } from 'express';
import { authenticate, requireOrgMembership } from '../middleware/auth.middleware';
import * as taskController from '../controllers/task.controller';

const router = Router();
router.use(authenticate);
router.use(requireOrgMembership);

router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.get('/:id', taskController.getTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.patch('/:id/position', taskController.updateTaskPosition);
router.post('/:id/comments', taskController.addComment);

export default router;
