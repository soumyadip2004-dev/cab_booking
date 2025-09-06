// routes/admin.js - Admin Routes
const express = require('express');
const Rider = require('../models/Rider');
const Ride = require('../models/Ride');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

// Get all riders (for testing/admin)
router.get('/riders', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    if (status) {
      query.status = status;
    }

    const riders = await Rider.find(query)
      .select('-documents.license.number -documents.aadhar.number -bankDetails')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Rider.countDocuments(query);

    res.json({
      success: true,
      riders,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: skip + riders.length < total
      }
    });
  } catch (error) {
    logger.error('Get riders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch riders'
    });
  }
});

// Seed sample riders
router.post('/seed-riders', async (req, res) => {
  try {
    const sampleRiders = [
      {
        name: 'Rajesh Kumar',
        phoneNumber: '9876543210',
        vehicleType: 'bike',
        vehicleDetails: {
          number: 'KA 01 AB 1234',
          model: 'Honda Activa',
          color: 'Red',
          year: 2022
        },
        rating: { average: 4.8, count: 125 },
        status: 'approved'
      },
      {
        name: 'Amit Singh',
        phoneNumber: '8765432109',
        vehicleType: 'bike',
        vehicleDetails: {
          number: 'KA 05 CD 5678',
          model: 'Bajaj Pulsar',
          color: 'Black',
          year: 2023
        },
        rating: { average: 4.7, count: 98 },
        status: 'approved'
      },
      {
        name: 'Priya Sharma',
        phoneNumber: '7654321098',
        vehicleType: 'cab',
        vehicleDetails: {
          number: 'KA 02 EF 9012',
          model: 'Maruti Swift',
          color: 'White',
          year: 2021,
          capacity: 4
        },
        rating: { average: 4.9, count: 234 },
        status: 'approved'
      },
      {
        name: 'Mohammed Ali',
        phoneNumber: '6543210987',
        vehicleType: 'auto',
        vehicleDetails: {
          number: 'KA 03 GH 3456',
          model: 'Bajaj Auto',
          color: 'Yellow',
          year: 2020,
          capacity: 3
        },
        rating: { average: 4.6, count: 167 },
        status: 'approved'
      },
      {
        name: 'Suresh Reddy',
        phoneNumber: '5432109876',
        vehicleType: 'cab',
        vehicleDetails: {
          number: 'KA 04 IJ 7890',
          model: 'Hyundai i20',
          color: 'Blue',
          year: 2022,
          capacity: 4
        },
        rating: { average: 4.5, count: 89 },
        status: 'approved'
      }
    ];

    // Clear existing riders
    await Rider.deleteMany({});
    
    // Insert sample riders
    const riders = await Rider.insertMany(sampleRiders);

    logger.info(`Seeded ${riders.length} sample riders`);

    res.json({
      success: true,
      message: 'Sample riders added successfully',
      count: riders.length,
      riders: riders.map(r => ({
        id: r._id,
        name: r.name,
        phoneNumber: r.phoneNumber,
        vehicleType: r.vehicleType,
        vehicleDetails: r.vehicleDetails,
        rating: r.rating
      }))
    });

  } catch (error) {
    logger.error('Seed riders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed riders'
    });
  }
});

// Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const [userCount, riderCount, rideCount, activeRides] = await Promise.all([
      User.countDocuments(),
      Rider.countDocuments(),
      Ride.countDocuments(),
      Ride.countDocuments({ status: { $in: ['requested', 'accepted', 'started'] } })
    ]);

    const recentRides = await Ride.find()
      .populate('userId', 'phoneNumber name')
      .populate('riderId', 'name phoneNumber')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        users: userCount,
        riders: riderCount,
        totalRides: rideCount,
        activeRides
      },
      recentRides: recentRides.map(ride => ({
        id: ride._id,
        rideId: ride.rideId,
        passenger: ride.userId?.name || ride.passengerDetails.name,
        rider: ride.riderId?.name || 'Not assigned',
        status: ride.status,
        amount: ride.pricing.estimatedCost,
        createdAt: ride.createdAt
      }))
    });

  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;