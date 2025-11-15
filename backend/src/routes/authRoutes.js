import express from 'express';
import { register, login, getProfile, updateProfile, changePassword } from '../controllers/authController.js';
import { authMiddleware, validate, requireAdmin } from '../middlewares/index.js';

const router = express.Router();

// Public routes - authLimiter removed since apiLimiter is already applied globally
router.post('/register', validate('register'), register);
router.post('/login', validate('login'), login);

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.post('/change-password', authMiddleware, changePassword);

export default router;
