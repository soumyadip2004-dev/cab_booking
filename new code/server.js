// server.js - Main Express Server
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickride', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// User Schema
const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    code: String,
    expiry: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

// Rider Schema
const riderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'auto', 'cab'],
    required: true
  },
  vehicleNumber: {
    type: String,
    required: true
  },
  vehicleModel: String,
  rating: {
    type: Number,
    default: 4.5,
    min: 1,
    max: 5
  },
  totalRides: {
    type: Number,
    default: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  documents: {
    license: String,
    aadhar: String,
    vehicleRC: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Rider = mongoose.model('Rider', riderSchema);

// Ride Schema
const rideSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider'
  },
  passengerName: {
    type: String,
    required: true
  },
  pickupLocation: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  dropLocation: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  rideType: {
    type: String,
    enum: ['bike', 'auto', 'cab'],
    required: true
  },
  scheduledDateTime: {
    type: Date,
    required: true
  },
  distance: {
    type: Number,
    required: true
  },
  estimatedCost: {
    type: Number,
    required: true
  },
  actualCost: Number,
  status: {
    type: String,
    enum: ['requested', 'accepted', 'started', 'completed', 'cancelled'],
    default: 'requested'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  rating: {
    passengerRating: Number,
    riderRating: Number,
    feedback: String
  },
  route: [{
    latitude: Number,
    longitude: Number,
    timestamp: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Ride = mongoose.model('Ride', rideSchema);

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Helper Functions
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const calculateDistance = (pickup, drop) => {
  // Simulate distance calculation (in real app, use Google Maps API)
  return Math.floor(Math.random() * 20) + 5; // 5-25 km
};

const calculateCost = (distance, rideType) => {
  const rates = {
    bike: 8,
    auto: 12,
    cab: 15
  };
  return distance * rates[rideType];
};

const findAvailableRider = async (rideType, pickupLocation) => {
  try {
    const riders = await Rider.find({
      vehicleType: rideType,
      isAvailable: true
    }).limit(5);
    
    // Return random rider from available ones
    if (riders.length > 0) {
      const randomIndex = Math.floor(Math.random() * riders.length);
      return riders[randomIndex];
    }
    return null;
  } catch (error) {
    console.error('Error finding rider:', error);
    return null;
  }
};

// Routes

// Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber || phoneNumber.length !== 10) {
      return res.status(400).json({ error: 'Valid 10-digit phone number required' });
    }

    const otp = generateOTP();
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

    // In production, send SMS using services like Twilio
    console.log(`OTP for ${phoneNumber}: ${otp}`);

    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      // In development, return OTP (remove in production)
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP and Login
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    const user = await User.findOne({ phoneNumber });
    
    if (!user || !user.otp || user.otp.expiry < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (user.otp.code !== otp) {
      return res.status(400).json({ error: 'Incorrect OTP' });
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

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Book a ride
app.post('/api/rides/book', authenticateToken, async (req, res) => {
  try {
    const {
      passengerName,
      pickupLocation,
      dropLocation,
      rideType,
      scheduledDateTime
    } = req.body;

    // Validation
    if (!passengerName || !pickupLocation || !dropLocation || !rideType || !scheduledDateTime) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Calculate distance and cost
    const distance = calculateDistance(pickupLocation, dropLocation);
    const estimatedCost = calculateCost(distance, rideType);

    // Find available rider
    const rider = await findAvailableRider(rideType, pickupLocation);
    
    if (!rider) {
      return res.status(404).json({ error: 'No riders available at the moment' });
    }

    // Create ride
    const ride = new Ride({
      userId: req.user.userId,
      riderId: rider._id,
      passengerName,
      pickupLocation: {
        address: pickupLocation,
        coordinates: {
          latitude: 12.9716 + (Math.random() - 0.5) * 0.1,
          longitude: 77.5946 + (Math.random() - 0.5) * 0.1
        }
      },
      dropLocation: {
        address: dropLocation,
        coordinates: {
          latitude: 12.9716 + (Math.random() - 0.5) * 0.1,
          longitude: 77.5946 + (Math.random() - 0.5) * 0.1
        }
      },
      rideType,
      scheduledDateTime: new Date(scheduledDateTime),
      distance,
      estimatedCost,
      status: 'accepted'
    });

    await ride.save();

    // Update rider availability
    rider.isAvailable = false;
    rider.totalRides += 1;
    await rider.save();

    // Populate rider details
    await ride.populate('riderId');

    // Calculate ETA
    const eta = Math.floor(Math.random() * 10) + 3; // 3-12 minutes

    res.json({
      success: true,
      message: 'Ride booked successfully',
      ride: {
        id: ride._id,
        passengerName: ride.passengerName,
        pickupLocation: ride.pickupLocation.address,
        dropLocation: ride.dropLocation.address,
        rideType: ride.rideType,
        scheduledDateTime: ride.scheduledDateTime,
        distance: ride.distance,
        estimatedCost: ride.estimatedCost,
        status: ride.status,
        rider: {
          name: rider.name,
          phoneNumber: rider.phoneNumber,
          vehicleModel: rider.vehicleModel,
          vehicleNumber: rider.vehicleNumber,
          rating: rider.rating,
          eta: `${eta} mins`
        }
      }
    });

  } catch (error) {
    console.error('Book ride error:', error);
    res.status(500).json({ error: 'Failed to book ride' });
  }
});

// Get user's rides
app.get('/api/rides', authenticateToken, async (req, res) => {
  try {
    const rides = await Ride.find({ userId: req.user.userId })
      .populate('riderId', 'name phoneNumber vehicleModel vehicleNumber rating')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      rides: rides.map(ride => ({
        id: ride._id,
        passengerName: ride.passengerName,
        pickupLocation: ride.pickupLocation.address,
        dropLocation: ride.dropLocation.address,
        rideType: ride.rideType,
        scheduledDateTime: ride.scheduledDateTime,
        distance: ride.distance,
        estimatedCost: ride.estimatedCost,
        actualCost: ride.actualCost,
        status: ride.status,
        paymentStatus: ride.paymentStatus,
        createdAt: ride.createdAt,
        rider: ride.riderId ? {
          name: ride.riderId.name,
          phoneNumber: ride.riderId.phoneNumber,
          vehicleModel: ride.riderId.vehicleModel,
          vehicleNumber: ride.riderId.vehicleNumber,
          rating: ride.riderId.rating
        } : null
      }))
    });

  } catch (error) {
    console.error('Get rides error:', error);
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

// Get ride details
app.get('/api/rides/:rideId', authenticateToken, async (req, res) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.rideId,
      userId: req.user.userId
    }).populate('riderId', 'name phoneNumber vehicleModel vehicleNumber rating');

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    res.json({
      success: true,
      ride: {
        id: ride._id,
        passengerName: ride.passengerName,
        pickupLocation: ride.pickupLocation,
        dropLocation: ride.dropLocation,
        rideType: ride.rideType,
        scheduledDateTime: ride.scheduledDateTime,
        distance: ride.distance,
        estimatedCost: ride.estimatedCost,
        actualCost: ride.actualCost,
        status: ride.status,
        paymentStatus: ride.paymentStatus,
        route: ride.route,
        rating: ride.rating,
        createdAt: ride.createdAt,
        rider: ride.riderId
      }
    });

  } catch (error) {
    console.error('Get ride details error:', error);
    res.status(500).json({ error: 'Failed to fetch ride details' });
  }
});

// Cancel ride
app.patch('/api/rides/:rideId/cancel', authenticateToken, async (req, res) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.rideId,
      userId: req.user.userId
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status === 'completed' || ride.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot cancel this ride' });
    }

    ride.status = 'cancelled';
    ride.updatedAt = new Date();
    await ride.save();

    // Make rider available again
    if (ride.riderId) {
      await Rider.findByIdAndUpdate(ride.riderId, { isAvailable: true });
    }

    res.json({
      success: true,
      message: 'Ride cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ error: 'Failed to cancel ride' });
  }
});

// Rate ride
app.patch('/api/rides/:rideId/rate', authenticateToken, async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const ride = await Ride.findOne({
      _id: req.params.rideId,
      userId: req.user.userId
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status !== 'completed') {
      return res.status(400).json({ error: 'Can only rate completed rides' });
    }

    ride.rating = {
      passengerRating: rating,
      feedback: feedback || ''
    };
    ride.updatedAt = new Date();
    await ride.save();

    // Update rider's overall rating
    if (ride.riderId) {
      const rider = await Rider.findById(ride.riderId);
      if (rider) {
        const totalRatings = rider.totalRides;
        const newRating = ((rider.rating * (totalRatings - 1)) + rating) / totalRatings;
        rider.rating = Math.round(newRating * 10) / 10;
        await rider.save();
      }
    }

    res.json({
      success: true,
      message: 'Thank you for your feedback!'
    });

  } catch (error) {
    console.error('Rate ride error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// Get available riders (admin/testing endpoint)
app.get('/api/admin/riders', async (req, res) => {
  try {
    const riders = await Rider.find().select('-documents');
    res.json({ success: true, riders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch riders' });
  }
});

// Seed riders (for testing)
app.post('/api/admin/seed-riders', async (req, res) => {
  try {
    const sampleRiders = [
      {
        name: 'Rajesh Kumar',
        phoneNumber: '+919876543210',
        vehicleType: 'bike',
        vehicleNumber: 'KA 01 AB 1234',
        vehicleModel: 'Honda Activa',
        rating: 4.8
      },
      {
        name: 'Amit Singh',
        phoneNumber: '+918765432109',
        vehicleType: 'bike',
        vehicleNumber: 'KA 05 CD 5678',
        vehicleModel: 'Bajaj Pulsar',
        rating: 4.7
      },
      {
        name: 'Priya Sharma',
        phoneNumber: '+917654321098',
        vehicleType: 'cab',
        vehicleNumber: 'KA 02 EF 9012',
        vehicleModel: 'Maruti Swift',
        rating: 4.9
      },
      {
        name: 'Mohammed Ali',
        phoneNumber: '+916543210987',
        vehicleType: 'auto',
        vehicleNumber: 'KA 03 GH 3456',
        vehicleModel: 'Bajaj Auto',
        rating: 4.6
      },
      {
        name: 'Suresh Reddy',
        phoneNumber: '+915432109876',
        vehicleType: 'cab',
        vehicleNumber: 'KA 04 IJ 7890',
        vehicleModel: 'Hyundai i20',
        rating: 4.5
      }
    ];

    await Rider.deleteMany({}); // Clear existing riders
    await Rider.insertMany(sampleRiders);

    res.json({
      success: true,
      message: 'Sample riders added successfully',
      count: sampleRiders.length
    });

  } catch (error) {
    console.error('Seed riders error:', error);
    res.status(500).json({ error: 'Failed to seed riders' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
});

module.exports = app;