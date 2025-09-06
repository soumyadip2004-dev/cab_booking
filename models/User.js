// models/User.js - User Model
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian phone number']
  },
  name: {
    type: String,
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    code: String,
    expiry: Date
  },
  profile: {
    avatar: String,
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    }
  },
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    currency: {
      type: String,
      default: 'INR'
    },
    notifications: {
      sms: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    }
  },
  stats: {
    totalRides: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ phoneNumber: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);

// ===========================================
