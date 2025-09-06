//routes/auth.js - Authentication Routes
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const sendOTPValidation = [
  body('phoneNumber')
    .isLength({ min: 10, max: 10 })
    .withMessage('Phone number must be 10 digits')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Invalid Indian phone number format')
];

const verifyOTPValidation = [
  body('phoneNumber')
    .isLength({ min: 10, max: 10 })
    .withMessage('Phone number must be 10 digits'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2-50 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
];

// Routes
router.post('/send-otp', sendOTPValidation, authController.sendOTP);
router.post('/verify-otp', verifyOTPValidation, authController.verifyOTP);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, updateProfileValidation, authController.updateProfile);

module.exports = router;