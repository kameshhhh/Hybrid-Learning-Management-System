import { Router } from 'express';
import { adminSessionController } from '../controllers/adminSessionController';
import { authMiddleware, adminOnly as requireAdmin } from '../middleware/auth';

const router = Router();

// All admin session routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

// Session management routes (for Admin Portal)
router.get('/sessions', adminSessionController.getAllActiveSessions);
router.get('/users/:userId/sessions', adminSessionController.getUserLoginHistory);
router.get('/users/:userId/failed-attempts', adminSessionController.getFailedLoginAttempts);
router.post('/users/:userId/force-logout', adminSessionController.forceLogoutUser);
router.post('/users/:userId/block', adminSessionController.toggleUserBlock);
router.post('/users/:userId/reset-password', adminSessionController.adminResetPassword);
router.post('/users/:userId/reset-failed-counter', adminSessionController.resetFailedLoginCounter);

export default router;
