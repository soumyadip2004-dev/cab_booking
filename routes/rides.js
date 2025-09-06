//routes/rides.js - Ride Routes
const express = require('express');
const { body, param, query } = require('express-validator');
const rideController = require('../controllers/rideController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation rules
const bookRideValidation = [
  body('passengerName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Passenger name must be between 2-50 characters'),
  body('pickupLocation')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Pickup location is required and must be under 200 characters'),
  body('dropLocation')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Drop location is required and must be under 200 characters'),
  body('rideType')
    .isIn(['bike', 'auto', 'cab'])
    .withMessage('Invalid ride type'),
  body('scheduledDateTime')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const scheduledDate = new Date(value);
      const now = new Date();
      if (scheduledDate < now) {
        throw new Error('Scheduled time cannot be in the past');
      }
      return true;
    })
];

const rideIdValidation = [
  param('rideId')
    .isMongoId()
    .withMessage('Invalid ride ID')
];

const ratingValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Feedback cannot exceed 500 characters')
];

// Routes
router.post('/book', bookRideValidation, rideController.bookRide);
router.get('/', rideController.getRides);
router.get('/:rideId', rideIdValidation, rideController.getRideDetails);
router.patch('/:rideId/cancel', rideIdValidation, rideController.cancelRide);
router.patch('/:rideId/rate', rideIdValidation, ratingValidation, rideController.rateRide);

module.exports = router;