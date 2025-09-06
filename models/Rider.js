// models/Rider.js - Rider Model
const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please provide a valid phone number']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'auto', 'cab'],
    required: true
  },
  vehicleDetails: {
    number: { type: String, required: true },
    model: String,
    color: String,
    year: Number,
    capacity: { type: Number, default: 1 }
  },
  documents: {
    license: {
      number: String,
      expiryDate: Date,
      verified: { type: Boolean, default: false }
    },
    aadhar: {
      number: String,
      verified: { type: Boolean, default: false }
    },
    vehicleRC: {
      number: String,
      expiryDate: Date,
      verified: { type: Boolean, default: false }
    },
    insurance: {
      number: String,
      expiryDate: Date,
      verified: { type: Boolean, default: false }
    }
  },
  rating: {
    average: { type: Number, default: 4.5, min: 1, max: 5 },
    count: { type: Number, default: 0 }
  },
  stats: {
    totalRides: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    completionRate: { type: Number, default: 100 }
  },
  availability: {
    isAvailable: { type: Boolean, default: true },
    workingHours: {
      start: { type: String, default: '06:00' },
      end: { type: String, default: '23:00' }
    }
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere' },
    address: String,
    city: String,
    lastUpdated: { type: Date, default: Date.now }
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
riderSchema.index({ phoneNumber: 1 });
riderSchema.index({ vehicleType: 1, 'availability.isAvailable': 1 });
riderSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Rider', riderSchema);

// ===========================================
