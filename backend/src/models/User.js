import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: {
      values: ['superadmin', 'admin', 'analyst', 'viewer'],
      message: 'Role must be superadmin, admin, analyst, or viewer'
    },
    default: 'viewer'
  },
  organizationRole: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member'
  },
  isSuperAdmin: {
    type: Boolean,
    default: false
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  avatar: String,
  timezone: {
    type: String,
    default: 'UTC'
  },
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    usageAlerts: {
      type: Boolean,
      default: true
    }
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  invitedAt: Date,
  acceptedAt: Date,
  lastLogin: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Organization role helpers
userSchema.methods.isOwner = function() {
  return this.organizationRole === 'owner';
};

userSchema.methods.isOrgAdmin = function() {
  return ['owner', 'admin'].includes(this.organizationRole);
};

userSchema.methods.canManageTeam = function() {
  return this.isOrgAdmin();
};

userSchema.methods.canManageBilling = function() {
  return this.isOwner();
};

userSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    organizationRole: this.organizationRole,
    organizationId: this.organizationId,
    isSuperAdmin: this.isSuperAdmin,
    avatar: this.avatar,
    emailVerified: this.emailVerified,
    isActive: this.isActive,
    preferences: this.preferences,
    createdAt: this.createdAt,
    lastLogin: this.lastLogin
  };
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.passwordResetToken;
  return obj;
};

// Statics
userSchema.statics.findByOrganization = function(organizationId) {
  return this.find({ organizationId, isActive: true });
};

const User = mongoose.model('User', userSchema);

export default User;
