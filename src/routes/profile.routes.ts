import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  uploadDocuments,
} from '../controllers/profile.controller';
import { verifyToken } from '../middleware/auth';
import { uploadDocuments as uploadMiddleware } from '../middleware/upload';

const router = Router();

router.use(verifyToken);

router.get('/', getProfile);

router.put('/', updateProfile);

router.post('/upload-documents', uploadMiddleware, uploadDocuments);

export default router;
