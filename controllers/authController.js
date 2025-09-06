//controllers/authController.js - Authentication Controller
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const smsService = require('../utils/sms');
const logger = require('../utils/logger');

class AuthController {
  // Send OTP
  async sendOTP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { phoneNumber } = req.body;
      const otp = this.generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      let user = await User.findOne({ phoneNumber });
      
      if (user) {
        user.otp = { code: otp, expiry: otpExpiry };
        await user.save();
      } else {
        user = new User({
          phoneNumber,
          otp: { code: otp, expiry: otpExpiry }
        });
        await user.save();
      }

      // Send SMS
      const smsResult = await smsService.sendOTP(phoneNumber, otp);
      
      if (!smsResult.success && !smsResult.mock) {
        logger.error('SMS sending failed:', smsResult.error);
      }

      logger.info(`OTP sent to ${phoneNumber}`);

      res.json({
        success: true,
        message: 'OTP sent successfully',
        // Include OTP in development mode only
        ...(process.env.NODE_ENV === 'development' && { otp })
      });

    } catch (error) {
      logger.error('Send OTP error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send OTP'
      });
    }
  }

  // Verify OTP
  async verifyOTP(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { phoneNumber, otp } = req.body;

      const user = await User.findOne({ phoneNumber });
      
      if (!user || !user.otp || user.otp.expiry < new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired OTP'
        });
      }

      if (user.otp.code !== otp) {
        return res.status(400).json({
          success: false,
          error: 'Incorrect OTP'
        });
      }

      // Mark user as verified and clear OTP
      user.isVerified = true;
      user.otp = undefined;
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, phoneNumber: user.phoneNumber },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      logger.info(`User ${phoneNumber} logged in successfully`);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          isVerified: user.isVerified
        }
      });

    } catch (error) {
      logger.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify OTP'
      });
    }
  }

  // Update Profile
  async updateProfile(req, res) {
    try {
      const { name, email } = req.body;
      const userId = req.user.userId;

      const user = await User.findByIdAndUpdate(
        userId,
        { name, email },
        { new: true, runValidators: true }
      ).select('-otp');

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }

  // Get Profile
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId).select('-otp');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch profile'
      });
    }
  }

  // Helper method to generate OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

module.exports = new AuthController();

// ===========================================