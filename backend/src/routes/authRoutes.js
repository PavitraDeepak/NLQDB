import express from 'express';
import { register, login, getProfile, updateProfile } from '../controllers/authController.js';
import { authMiddleware, validate, requireAdmin } from '../middlewares/index.js';

const router = express.Router();

// Public routes - authLimiter removed since apiLimiter is already applied globally
router.post('/login', validate('login'), login);

// Protected routes
router.post('/register', authMiddleware, requireAdmin, validate('register'), register);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

export default router;
