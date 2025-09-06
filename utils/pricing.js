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
      high_demand: 2.0,    // High demand areas/times
      night: 1.3           // 10 PM - 6 AM
    };

    this.minimumFare = {
      bike: 25,
      auto: 40,
      cab: 60
    };

    this.timeBasedRates = {
      bike: 2,   // per minute
      auto: 3,   // per minute
      cab: 4     // per minute
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

    // Peak hours surge (8-10 AM, 6-8 PM)
    if ((hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 20)) {
      surgeMultiplier *= this.surgePricing.peak_hours;
    }

    // Night hours surge (10 PM - 6 AM)
    if (hour >= 22 || hour <= 6) {
      surgeMultiplier *= this.surgePricing.night;
    }

    // Weekend surge
    if (day === 0 || day === 6) {
      surgeMultiplier *= this.surgePricing.weekend;
    }

    // High demand areas (simplified)
    const highDemandAreas = ['mg road', 'koramangala', 'whitefield', 'electronic city', 'airport'];
    const isHighDemandArea = highDemandAreas.some(area => 
      location.toLowerCase().includes(area)
    );
    
    if (isHighDemandArea) {
      surgeMultiplier *= 1.3;
    }

    // Weather-based surge (mock)
    const isRainyWeather = Math.random() < 0.3; // 30% chance of rain
    if (isRainyWeather) {
      surgeMultiplier *= this.surgePricing.rain;
    }

    return Math.min(surgeMultiplier, 3.0); // Cap at 3x surge
  }

  calculateFinalPrice(distance, rideType, scheduledDateTime, pickupLocation) {
    const baseFare = this.calculateBaseFare(distance, rideType);
    const surgeMultiplier = this.calculateSurgeMultiplier(scheduledDateTime, pickupLocation);
    const estimatedTime = this.getEstimatedTime(distance, rideType);
    
    // Add time-based component
    const timeBasedFare = estimatedTime * (this.timeBasedRates[rideType] || 2);
    const totalBaseFare = baseFare + (timeBasedFare * 0.3); // 30% weightage to time
    
    const finalPrice = Math.round(totalBaseFare * surgeMultiplier);
    
    return {
      baseFare: Math.round(baseFare),
      timeBasedFare: Math.round(timeBasedFare * 0.3),
      surgeMultiplier: Math.round(surgeMultiplier * 100) / 100,
      finalPrice,
      breakdown: {
        distance,
        estimatedTime,
        ratePerKm: this.baseRates[rideType],
        ratePerMin: this.timeBasedRates[rideType],
        minimumFare: this.minimumFare[rideType],
        surgeApplied: surgeMultiplier > 1.0,
        taxes: Math.round(finalPrice * 0.05), // 5% tax
        platformFee: 10
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
    
    // Add buffer time for traffic
    const bufferTime = Math.round(timeInMinutes * 0.2); // 20% buffer
    return Math.max(timeInMinutes + bufferTime, 10); // Minimum 10 minutes
  }

  calculateWaitingCharges(waitingTimeMinutes, rideType) {
    if (waitingTimeMinutes <= 3) return 0; // First 3 minutes free
    
    const rates = {
      bike: 1,   // ₹1 per minute
      auto: 1.5, // ₹1.5 per minute
      cab: 2     // ₹2 per minute
    };

    return (waitingTimeMinutes - 3) * (rates[rideType] || 1);
  }
}

module.exports = new PricingEngine();

// ===========================================
