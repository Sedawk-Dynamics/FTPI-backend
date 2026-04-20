import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllMemberships,
  getMembershipDetail,
  approveMembership,
  rejectMembership,
  extendMembership,
  revokeMembership,
  updateMembership,
  deleteMembership,
  bulkMembershipAction,
  exportMembershipsCSV,
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUser,
  getAllPayments,
  updatePaymentStatus,
  refundPayment,
  getAnalytics,
  getActivityLog,
  getSettings,
  updateSettings,
} from '../controllers/admin.controller';
import {
  getAllNews,
  createNews,
  updateNews,
  deleteNews,
} from '../controllers/news.controller';
import {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/events.controller';
import { verifyToken, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadNewsImage, uploadEventImage } from '../middleware/upload';

const router = Router();

router.use(verifyToken, requireAdmin);

// Dashboard & analytics
router.get('/stats', getDashboardStats);
router.get('/analytics', getAnalytics);
router.get('/activity', getActivityLog);

// Memberships (subscriptions)
router.get('/memberships', getAllMemberships);
router.get('/memberships/export', exportMembershipsCSV);
router.post('/memberships/bulk', bulkMembershipAction);
router.get('/memberships/:id', getMembershipDetail);
router.put('/memberships/:id', updateMembership);
router.delete('/memberships/:id', deleteMembership);
router.put('/memberships/:id/approve', approveMembership);
router.put(
  '/memberships/:id/reject',
  validate([body('reason').optional().isString()]),
  rejectMembership
);
router.put('/memberships/:id/extend', extendMembership);
router.put('/memberships/:id/revoke', revokeMembership);

// Users
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Payments
router.get('/payments', getAllPayments);
router.put('/payments/:id', updatePaymentStatus);
router.put('/payments/:id/refund', refundPayment);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// News (admin CRUD)
router.get('/news', getAllNews);
router.post('/news', uploadNewsImage, createNews);
router.put('/news/:id', uploadNewsImage, updateNews);
router.delete('/news/:id', deleteNews);

// Events (admin CRUD)
router.get('/events', getAllEvents);
router.post('/events', uploadEventImage, createEvent);
router.put('/events/:id', uploadEventImage, updateEvent);
router.delete('/events/:id', deleteEvent);

export default router;
