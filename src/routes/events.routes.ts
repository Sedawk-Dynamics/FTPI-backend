import { Router } from 'express';
import { body } from 'express-validator';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  getEventById,
  getPublicEvents,
  getAllEvents,
} from '../controllers/events.controller';
import { verifyToken, requireAdmin } from '../middleware/auth';
import { uploadEventImage } from '../middleware/upload';
import { validate } from '../middleware/validate';

const router = Router();

// Public routes
router.get('/public', getPublicEvents);
router.get('/:id', getEventById);

// Admin routes
router.post(
  '/',
  verifyToken,
  requireAdmin,
  uploadEventImage,
  validate([
    body('title').notEmpty().withMessage('Title is required.'),
    body('description').notEmpty().withMessage('Description is required.'),
    body('date').notEmpty().withMessage('Date is required.'),
  ]),
  createEvent
);

router.put(
  '/:id',
  verifyToken,
  requireAdmin,
  uploadEventImage,
  updateEvent
);

router.delete('/:id', verifyToken, requireAdmin, deleteEvent);

// Admin list (all events including unpublished)
router.get('/', verifyToken, requireAdmin, getAllEvents);

export default router;
