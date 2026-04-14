import { Router } from 'express';
import { searchMembers } from '../controllers/member.controller';

const router = Router();

router.get('/search', searchMembers);

export default router;
