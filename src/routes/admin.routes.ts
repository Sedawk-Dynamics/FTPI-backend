import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllMemberships,
  approveMembership,
  rejectMembership,
  getDashboardStats,
  getAllUsers,
} from '../controllers/admin.controller';
import {
  getAllNews,
  createNews,
  updateNews,
} from '../controllers/news.controller';
import {
  getAllEvents,
  createEvent,
  updateEvent,
} from '../controllers/events.controller';
import { verifyToken, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(verifyToken, requireAdmin);

// Dashboard stats
router.get('/stats', getDashboardStats);

// Memberships
router.get('/memberships', getAllMemberships);
router.get('/memberships/:id', async (req, res) => {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const membership = await prisma.membership.findUnique({
      where: { id: req.params.id },
      include: { user: { include: { profile: true } }, payment: true },
    });
    if (!membership) { res.status(404).json({ success: false, message: 'Membership not found.' }); return; }
    res.json({ success: true, data: membership });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});
router.put('/memberships/:id/approve', approveMembership);
router.put(
  '/memberships/:id/reject',
  validate([
    body('reason').optional().isString().withMessage('Reason must be a string.'),
  ]),
  rejectMembership
);

// Users
router.get('/users', getAllUsers);

// News (admin CRUD)
router.get('/news', getAllNews);
router.post('/news', createNews);
router.put('/news/:id', updateNews);

// Events (admin CRUD)
router.get('/events', getAllEvents);
router.post('/events', createEvent);
router.put('/events/:id', updateEvent);

export default router;
