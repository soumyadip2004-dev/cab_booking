// middleware/auth.js - Enhanced Authentication Middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
};

module.exports = { authenticateToken };

// ===========================================

// utils/validation.js - Input Validation Utilities
const { body, validationResult } = require('express-validator');

const validatePhoneNumber = (phoneNumber) => {
  const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile number format
  return phoneRegex.test(phoneNumber);
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const sendOTPValidation = [
  body('phoneNumber')
    .isLength({ min: 10, max: 10 })
    .withMessage('Phone number must be 10 digits')
    .custom((value) => {
      if (!validatePhoneNumber(value)) {
        throw new Error('Invalid phone number format');
      }
      return true;
    })
];

const verifyOTPValidation = [
  body('phoneNumber')
    .isLength({ min: 10, max: 10 })
    .withMessage('Phone number must be 10 digits'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
];

const bookRideValidation = [
  body('passengerName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Passenger name must be between 2-50 characters'),
  body('pickupLocation')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Pickup location is required'),
  body('dropLocation')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Drop location is required'),
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

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: errors.array()
    });
  }
  next();
};

module.exports = {
  validatePhoneNumber,
  validateEmail,
  sendOTPValidation,
  verifyOTPValidation,
  bookRideValidation,
  handleValidationErrors
};

// ===========================================

// utils/sms.js - SMS Service Integration
const twilio = require('twilio');

class SMSService {
  constructor() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    }
  }

  async sendOTP(phoneNumber, otp) {
    try {
      if (!this.client) {
        console.log(`SMS Service not configured. OTP for ${phoneNumber}: ${otp}`);
        return { success: true, mock: true };
      }

      const message = `Your QuickRide OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.`;
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: `+91${phoneNumber}`
      });

      console.log('SMS sent successfully:', result.sid);
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendRideConfirmation(phoneNumber, rideDetails) {
    try {
      if (!this.client) {
        console.log(`Ride confirmation SMS for ${phoneNumber}:`, rideDetails);
        return { success: true, mock: true };
      }

      const message = `Ride confirmed! Pickup: ${rideDetails.pickup}, Drop: ${rideDetails.drop}. Rider: ${rideDetails.riderName} (${rideDetails.riderPhone})`;
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: `+91${phoneNumber}`
      });

      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SMSService();

// ===========================================

// utils/pricing.js - Dynamic Pricing Engine
class PricingEngine {
  constructor() {
    this.baseRates = {
      bike: 8,
      auto: 12,
      cab: 15
    };

    this.surgePricing = {
      peak_hours: 1.5,     // 8-10 AM, 6-8 PM
      weekend: 1.2,        // Saturday, Sunday
      rain: 1.8,           // During rain
      high_demand: 2.0     // High demand areas/times
    };

    this.minimumFare = {
      bike: 25,
      auto: 40,
      cab: 60
    };
  }

  calculateBaseFare(distance, rideType) {
    const rate = this.baseRates[rideType] || this.baseRates.bike;
    const baseFare = distance * rate;
    const minimumFare = this.minimumFare[rideType];
    
    return Math.max(baseFare, minimumFare);
  }

  calculateSurgeMultiplier(scheduledDateTime, location) {
    let surgeMultiplier = 1.0;
    const date = new Date(scheduledDateTime);
    const hour = date.getHours();
    const day = date.getDay();

    // Peak hours surge
    if ((hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 20)) {
      surgeMultiplier *= this.surgePricing.peak_hours;
    }

    // Weekend surge
    if (day === 0 || day === 6) {
      surgeMultiplier *= this.surgePricing.weekend;
    }

    // High demand areas (simplified - in real app, use geolocation)
    const highDemandAreas = ['mg road', 'koramangala', 'whitefield', 'electronic city'];
    const isHighDemandArea = highDemandAreas.some(area => 
      location.toLowerCase().includes(area)
    );
    
    if (isHighDemandArea) {
      surgeMultiplier *= 1.3;
    }

    return Math.min(surgeMultiplier, 3.0); // Cap at 3x
  }

  calculateFinalPrice(distance, rideType, scheduledDateTime, pickupLocation) {
    const baseFare = this.calculateBaseFare(distance, rideType);
    const surgeMultiplier = this.calculateSurgeMultiplier(scheduledDateTime, pickupLocation);
    
    const finalPrice = Math.round(baseFare * surgeMultiplier);
    
    return {
      baseFare: Math.round(baseFare),
      surgeMultiplier: Math.round(surgeMultiplier * 100) / 100,
      finalPrice,
      breakdown: {
        distance,
        ratePerKm: this.baseRates[rideType],
        minimumFare: this.minimumFare[rideType],
        surgeApplied: surgeMultiplier > 1.0
      }
    };
  }

  getEstimatedTime(distance, rideType) {
    const averageSpeeds = {
      bike: 25,    // km/h in city traffic
      auto: 20,    // km/h in city traffic  
      cab: 22      // km/h in city traffic
    };

    const speed = averageSpeeds[rideType] || averageSpeeds.bike;
    const timeInHours = distance / speed;
    const timeInMinutes = Math.round(timeInHours * 60);
    
    return Math.max(timeInMinutes, 10); // Minimum 10 minutes
  }
}

module.exports = new PricingEngine();

// ===========================================

// utils/geolocation.js - Location and Distance Utilities
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRadians = (degree) => degree * (Math.PI / 180);
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

const generateMockCoordinates = (address) => {
  // Mock coordinates for Indian cities (Bangalore area)
  const baseCoords = {
    lat: 12.9716,
    lng: 77.5946
  };

  // Add some randomness based on address
  const hash = address.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const latOffset = (hash % 100) / 1000; // -0.1 to 0.1
  const lngOffset = ((hash * 7) % 100) / 1000; // -0.1 to 0.1
  
  return {
    latitude: baseCoords.lat + latOffset,
    longitude: baseCoords.lng + lngOffset
  };
};

const calculateMockDistance = (pickup, drop) => {
  const pickupCoords = generateMockCoordinates(pickup);
  const dropCoords = generateMockCoordinates(drop);
  
  const distance = haversineDistance(
    pickupCoords.latitude,
    pickupCoords.longitude,
    dropCoords.latitude,
    dropCoords.longitude
  );
  
  // Add some randomness and ensure minimum distance
  const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
  return Math.max(Math.round(distance * randomFactor), 2); // Minimum 2km
};

const isWithinServiceArea = (coordinates) => {
  // Define service area boundaries (Bangalore example)
  const serviceBounds = {
    north: 13.2,
    south: 12.7,
    east: 77.8,
    west: 77.3
  };
  
  return (
    coordinates.latitude >= serviceBounds.south &&
    coordinates.latitude <= serviceBounds.north &&
    coordinates.longitude >= serviceBounds.west &&
    coordinates.longitude <= serviceBounds.east
  );
};

module.exports = {
  haversineDistance,
  generateMockCoordinates,
  calculateMockDistance,
  isWithinServiceArea
};

// ===========================================

// utils/logger.js - Logging Utility
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'quickride-api' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log') 
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;