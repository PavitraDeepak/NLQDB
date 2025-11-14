import express from 'express';
import { register, login, getProfile, updateProfile } from '../controllers/authController.js';
import { authMiddleware, validate, authLimiter, requireAdmin } from '../middlewares/index.js';

const router = express.Router();

// Public routes
router.post('/login', authLimiter, validate('login'), login);

// Protected routes
router.post('/register', authMiddleware, requireAdmin, validate('register'), register);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

export default router;
