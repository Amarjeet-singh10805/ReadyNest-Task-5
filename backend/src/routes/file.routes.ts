import { Router } from 'express';
import { authenticate, requireOrgMembership } from '../middleware/auth.middleware';
import { upload } from '../config/cloudinary';
import * as fileController from '../controllers/file.controller';

const router = Router();
router.use(authenticate);
router.use(requireOrgMembership);

router.get('/', fileController.getFiles);
router.post('/upload', upload.single('file'), fileController.uploadFile);
router.post('/upload-multiple', upload.array('files', 10), fileController.uploadMultipleFiles);
router.get('/:id', fileController.getFile);
router.delete('/:id', fileController.deleteFile);

export default router;
