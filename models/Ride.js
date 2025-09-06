// models/Ride.js - Ride Model
const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  rideId: {
    type: String,
    unique: true,
    default: () => 'QR' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase()
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider'
  },
  passengerDetails: {
    name: { type: String, required: true },
    phoneNumber: String
  },
  locations: {
    pickup: {
      address: { type: String, required: true },
      coordinates: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
      },
      landmark: String
    },
    drop: {
      address: { type: String, required: true },
      coordinates: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
      },
      landmark: String
    }
  },
  rideDetails: {
    type: {
      type: String,
      enum: ['bike', 'auto', 'cab'],
      required: true
    },
    scheduledDateTime: { type: Date, required: true },
    actualStartTime: Date,
    actualEndTime: Date,
    distance: {
      estimated: { type: Number, required: true },
      actual: Number
    },
    duration: {
      estimated: Number,
      actual: Number
    }
  },
  pricing: {
    baseFare: { type: Number, required: true },
    surgeMultiplier: { type: Number, default: 1.0 },
    estimatedCost: { type: Number, required: true },
    actualCost: Number,
    breakdown: {
      distanceFare: Number,
      timeFare: Number,
      surgeFare: Number,
      taxes: Number,
      discount: Number
    }
  },
  status: {
    type: String,
    enum: ['requested', 'searching', 'accepted', 'started', 'completed', 'cancelled'],
    default: 'requested'
  },
  paymentDetails: {
    method: {
      type: String,
      enum: ['cash', 'card', 'wallet', 'upi'],
      default: 'cash'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date
  },
  ratings: {
    byPassenger: {
      rating: { type: Number, min: 1, max: 5 },
      feedback: String,
      ratedAt: Date
    },
    byRider: {
      rating: { type: Number, min: 1, max: 5 },
      feedback: String,
      ratedAt: Date
    }
  },
  tracking: {
    route: [{
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      timestamp: Date,
      speed: Number
    }],
    estimatedArrival: Date,
    currentLocation: {
      latitude: Number,
      longitude: Number,
      lastUpdated: Date
    }
  },
  cancellation: {
    cancelledBy: {
      type: String,
      enum: ['passenger', 'rider', 'system']
    },
    reason: String,
    cancelledAt: Date,
    cancellationFee: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
rideSchema.index({ userId: 1, createdAt: -1 });
rideSchema.index({ riderId: 1, createdAt: -1 });
rideSchema.index({ rideId: 1 });
rideSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Ride', rideSchema);

// ===========================================
