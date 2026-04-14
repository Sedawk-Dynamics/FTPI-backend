import { Router } from 'express';
import authRoutes from './auth.routes';
import membershipRoutes from './membership.routes';
import adminRoutes from './admin.routes';
import profileRoutes from './profile.routes';
import newsRoutes from './news.routes';
import eventsRoutes from './events.routes';
import paymentRoutes from './payment.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/memberships', membershipRoutes);
router.use('/admin', adminRoutes);
router.use('/profile', profileRoutes);
router.use('/news', newsRoutes);
router.use('/events', eventsRoutes);
router.use('/payments', paymentRoutes);

export default router;
