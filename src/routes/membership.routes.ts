import { Router } from 'express';
import {
  applyForMembership,
  getMyMemberships,
  getMembershipById,
  renewMembership,
} from '../controllers/membership.controller';
import { verifyToken } from '../middleware/auth';
import { uploadMembershipDocs } from '../middleware/upload';

const router = Router();

router.use(verifyToken);

router.post('/', uploadMembershipDocs, applyForMembership);

router.get('/my', getMyMemberships);

router.get('/:id', getMembershipById);

router.post('/:id/renew', renewMembership);

export default router;
