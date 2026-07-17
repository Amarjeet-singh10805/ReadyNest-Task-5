import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { upload } from '../config/cloudinary';
import * as userController from '../controllers/user.controller';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get('/', authorize(Role.SUPER_ADMIN), userController.getAllUsers);
router.get('/profile', userController.getUser.bind(null));
router.put('/profile', userController.updateProfile);
router.post('/avatar', upload.single('avatar'), userController.uploadAvatar);
router.put('/password', userController.changePassword);
router.get('/:id', userController.getUser);
router.patch('/:id/status', authorize(Role.SUPER_ADMIN), userController.toggleUserStatus);

export default router;
