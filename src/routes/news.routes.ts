import { Router } from 'express';
import { body } from 'express-validator';
import {
  createNews,
  updateNews,
  deleteNews,
  getNewsById,
  getPublicNews,
  getAllNews,
} from '../controllers/news.controller';
import { verifyToken, requireAdmin } from '../middleware/auth';
import { uploadNewsImage } from '../middleware/upload';
import { validate } from '../middleware/validate';

const router = Router();

// Public routes
router.get('/public', getPublicNews);
router.get('/:id', getNewsById);

// Admin routes
router.post(
  '/',
  verifyToken,
  requireAdmin,
  uploadNewsImage,
  validate([
    body('title').notEmpty().withMessage('Title is required.'),
    body('content').notEmpty().withMessage('Content is required.'),
  ]),
  createNews
);

router.put(
  '/:id',
  verifyToken,
  requireAdmin,
  uploadNewsImage,
  updateNews
);

router.delete('/:id', verifyToken, requireAdmin, deleteNews);

// Admin list (all news including unpublished)
router.get('/', verifyToken, requireAdmin, getAllNews);

export default router;
