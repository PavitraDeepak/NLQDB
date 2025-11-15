import jwt from 'jsonwebtoken';
import { User, Organization } from '../models/index.js';
import { asyncHandler } from '../middlewares/index.js';
import { Logger } from '../middlewares/logger.js';

/**
 * Register new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, organizationName } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'User with this email already exists'
    });
  }

  // Generate slug from organization name or email
  const orgName = organizationName || `${name}'s Organization`;
  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Create user first (without organization)
  const user = await User.create({
    name,
    email,
    password,
    organizationId: null,
    organizationRole: 'owner'
  });

  // Create organization with the user as owner
  const organization = await Organization.create({
    name: orgName,
    slug: slug,
    ownerUserId: user._id,
    plan: 'free',
    planStatus: 'active'
  });

  // Update user with organization
  user.organizationId = organization._id;
  await user.save();

  Logger.info('User registered with organization', {
    userId: user._id,
    email: user.email,
    organizationId: organization._id,
    role: user.organizationRole
  });

  // Generate token
  const token = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      organizationId: user.organizationId,
      organizationRole: user.organizationRole
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId,
        organizationRole: user.organizationRole
      }
    }
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  Logger.info('Login attempt', { email });

  // Find user and include password field
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    Logger.warn('Login failed - user not found', { email });
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Check if user is active
  if (!user.isActive) {
    Logger.warn('Login failed - inactive account', { email });
    return res.status(403).json({
      success: false,
      error: 'Account is inactive. Please contact administrator.'
    });
  }

  // Validate password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    Logger.warn('Login failed - invalid password', { email });
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate JWT token with organizationId
  const token = jwt.sign(
    { 
      id: user._id, 
      role: user.role,
      organizationId: user.organizationId,
      organizationRole: user.organizationRole
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

  Logger.info('User logged in successfully', {
    userId: user._id,
    email: user.email,
    role: user.role,
    tokenLength: token.length
  });

  const response = {
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  };

  Logger.info('Sending login response', { 
    hasToken: !!response.data.token,
    responseKeys: Object.keys(response)
  });

  res.json(response);
});

/**
 * Get current user profile
 * GET /api/auth/profile
 */
export const getProfile = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

/**
 * Update user profile
 * PUT /api/auth/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: user
  });
});
