// controllers/rideController.js - Ride Controller
const Ride = require('../models/Ride');
const Rider = require('../models/Rider');
const User = require('../models/User');
const pricingEngine = require('../utils/pricing');
const { calculateMockDistance, generateMockCoordinates } = require('../utils/geolocation');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class RideController {
  // Book a new ride
  async bookRide(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: errors.array()
        });
      }

      const {
        passengerName,
        pickupLocation,
        dropLocation,
        rideType,
        scheduledDateTime
      } = req.body;

      // Calculate distance and pricing
      const distance = calculateMockDistance(pickupLocation, dropLocation);
      const pricing = pricingEngine.calculateFinalPrice(
        distance,
        rideType,
        scheduledDateTime,
        pickupLocation
      );

      // Find available rider
      const rider = await this.findAvailableRider(rideType, pickupLocation);
      
      if (!rider) {
        return res.status(404).json({
          success: false,
          error: 'No riders available at the moment. Please try again.'
        });
      }

      // Generate coordinates
      const pickupCoords = generateMockCoordinates(pickupLocation);
      const dropCoords = generateMockCoordinates(dropLocation);

      // Create ride
      const ride = new Ride({
        userId: req.user.userId,
        riderId: rider._id,
        passengerDetails: {
          name: passengerName,
          phoneNumber: req.user.phoneNumber
        },
        locations: {
          pickup: {
            address: pickupLocation,
            coordinates: pickupCoords
          },
          drop: {
            address: dropLocation,
            coordinates: dropCoords
          }
        },
        rideDetails: {
          type: rideType,
          scheduledDateTime: new Date(scheduledDateTime),
          distance: {
            estimated: distance
          },
          duration: {
            estimated: pricingEngine.getEstimatedTime(distance, rideType)
          }
        },
        pricing: {
          baseFare: pricing.baseFare,
          surgeMultiplier: pricing.surgeMultiplier,
          estimatedCost: pricing.finalPrice,
          breakdown: pricing.breakdown
        },
        status: 'accepted'
      });

      await ride.save();

      // Update rider availability
      rider.availability.isAvailable = false;
      rider.stats.totalRides += 1;
      await rider.save();

      // Populate rider details
      await ride.populate('riderId');

      // Calculate ETA
      const eta = Math.floor(Math.random() * 10) + 3; // 3-12 minutes

      logger.info(`Ride booked: ${ride.rideId} by user ${req.user.userId}`);

      res.json({
        success: true,
        message: 'Ride booked successfully',
        ride: {
          id: ride._id,
          rideId: ride.rideId,
          passengerName: ride.passengerDetails.name,
          pickupLocation: ride.locations.pickup.address,
          dropLocation: ride.locations.drop.address,
          rideType: ride.rideDetails.type,
          scheduledDateTime: ride.rideDetails.scheduledDateTime,
          distance: ride.rideDetails.distance.estimated,
          estimatedCost: ride.pricing.estimatedCost,
          status: ride.status,
          rider: {
            name: rider.name,
            phoneNumber: rider.phoneNumber,
            vehicleModel: rider.vehicleDetails.model,
            vehicleNumber: rider.vehicleDetails.number,
            rating: rider.rating.average,
            eta: `${eta} mins`
          }
        }
      });

    } catch (error) {
      logger.error('Book ride error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to book ride'
      });
    }
  }

  // Get user's rides
  async getRides(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const skip = (page - 1) * limit;

      let query = { userId: req.user.userId };
      if (status) {
        query.status = status;
      }

      const rides = await Ride.find(query)
        .populate('riderId', 'name phoneNumber vehicleDetails rating')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Ride.countDocuments(query);

      res.json({
        success: true,
        rides: rides.map(ride => this.formatRideResponse(ride)),
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          hasNext: skip + rides.length < total
        }
      });

    } catch (error) {
      logger.error('Get rides error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch rides'
      });
    }
  }

  // Get specific ride details
  async getRideDetails(req, res) {
    try {
      const ride = await Ride.findOne({
        _id: req.params.rideId,
        userId: req.user.userId
      }).populate('riderId', 'name phoneNumber vehicleDetails rating');

      if (!ride) {
        return res.status(404).json({
          success: false,
          error: 'Ride not found'
        });
      }

      res.json({
        success: true,
        ride: this.formatDetailedRideResponse(ride)
      });

    } catch (error) {
      logger.error('Get ride details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch ride details'
      });
    }
  }

  // Cancel ride
  async cancelRide(req, res) {
    try {
      const { reason } = req.body;
      const ride = await Ride.findOne({
        _id: req.params.rideId,
        userId: req.user.userId
      });

      if (!ride) {
        return res.status(404).json({
          success: false,
          error: 'Ride not found'
        });
      }

      if (['completed', 'cancelled'].includes(ride.status)) {
        return res.status(400).json({
          success: false,
          error: 'Cannot cancel this ride'
        });
      }

      // Calculate cancellation fee if applicable
      let cancellationFee = 0;
      const timeDiff = Date.now() - ride.createdAt.getTime();
      if (timeDiff > 2 * 60 * 1000 && ride.status === 'accepted') { // 2 minutes
        cancellationFee = Math.min(ride.pricing.estimatedCost * 0.1, 50); // 10% or ₹50, whichever is lower
      }

      ride.status = 'cancelled';
      ride.cancellation = {
        cancelledBy: 'passenger',
        reason: reason || 'No reason provided',
        cancelledAt: new Date(),
        cancellationFee
      };
      ride.updatedAt = new Date();
      await ride.save();

      // Make rider available again
      if (ride.riderId) {
        await Rider.findByIdAndUpdate(ride.riderId, {
          'availability.isAvailable': true
        });
      }

      logger.info(`Ride cancelled: ${ride.rideId} by user ${req.user.userId}`);

      res.json({
        success: true,
        message: 'Ride cancelled successfully',
        cancellationFee
      });

    } catch (error) {
      logger.error('Cancel ride error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel ride'
      });
    }
  }

  // Rate ride
  async rateRide(req, res) {
    try {
      const { rating, feedback } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5'
        });
      }

      const ride = await Ride.findOne({
        _id: req.params.rideId,
        userId: req.user.userId
      });

      if (!ride) {
        return res.status(404).json({
          success: false,
          error: 'Ride not found'
        });
      }

      if (ride.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Can only rate completed rides'
        });
      }

      if (ride.ratings.byPassenger.rating) {
        return res.status(400).json({
          success: false,
          error: 'You have already rated this ride'
        });
      }

      ride.ratings.byPassenger = {
        rating,
        feedback: feedback || '',
        ratedAt: new Date()
      };
      await ride.save();

      // Update rider's overall rating
      if (ride.riderId) {
        await this.updateRiderRating(ride.riderId, rating);
      }

      logger.info(`Ride rated: ${ride.rideId} - Rating: ${rating}`);

      res.json({
        success: true,
        message: 'Thank you for your feedback!'
      });

    } catch (error) {
      logger.error('Rate ride error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit rating'
      });
    }
  }

  // Helper methods
  async findAvailableRider(rideType, pickupLocation) {
    try {
      const riders = await Rider.find({
        vehicleType: rideType,
        'availability.isAvailable': true,
        status: 'approved'
      }).limit(10);

      if (riders.length === 0) return null;

      // Simple selection - in production, use geolocation
      const randomIndex = Math.floor(Math.random() * riders.length);
      return riders[randomIndex];
    } catch (error) {
      logger.error('Error finding rider:', error);
      return null;
    }
  }

  async updateRiderRating(riderId, newRating) {
    try {
      const rider = await Rider.findById(riderId);
      if (!rider) return;

      const currentAverage = rider.rating.average;
      const currentCount = rider.rating.count;
      
      const newAverage = ((currentAverage * currentCount) + newRating) / (currentCount + 1);
      
      rider.rating.average = Math.round(newAverage * 10) / 10;
      rider.rating.count = currentCount + 1;
      await rider.save();
    } catch (error) {
      logger.error('Error updating rider rating:', error);
    }
  }

  formatRideResponse(ride) {
    return {
      id: ride._id,
      rideId: ride.rideId,
      passengerName: ride.passengerDetails.name,
      pickupLocation: ride.locations.pickup.address,
      dropLocation: ride.locations.drop.address,
      rideType: ride.rideDetails.type,
      scheduledDateTime: ride.rideDetails.scheduledDateTime,
      distance: ride.rideDetails.distance.estimated,
      estimatedCost: ride.pricing.estimatedCost,
      actualCost: ride.pricing.actualCost,
      status: ride.status,
      paymentStatus: ride.paymentDetails.status,
      createdAt: ride.createdAt,
      rider: ride.riderId ? {
        name: ride.riderId.name,
        phoneNumber: ride.riderId.phoneNumber,
        vehicleModel: ride.riderId.vehicleDetails.model,
        vehicleNumber: ride.riderId.vehicleDetails.number,
        rating: ride.riderId.rating.average
      } : null
    };
  }

  formatDetailedRideResponse(ride) {
    return {
      ...this.formatRideResponse(ride),
      locations: ride.locations,
      rideDetails: ride.rideDetails,
      pricing: ride.pricing,
      tracking: ride.tracking,
      ratings: ride.ratings,
      cancellation: ride.cancellation
    };
  }
}

module.exports = new RideController();