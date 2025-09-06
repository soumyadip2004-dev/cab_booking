// utils/geolocation.js - Geolocation Utilities
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
  
  return Math.round(distance * 100) / 100;
};

const generateMockCoordinates = (address) => {
  // Mock coordinates for Indian cities (Bangalore area)
  const cityCoords = {
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'delhi': { lat: 28.7041, lng: 77.1025 },
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'hyderabad': { lat: 17.3850, lng: 78.4867 }
  };

  // Default to Bangalore
  let baseCoords = cityCoords.bangalore;
  
  // Check if address contains city name
  const addressLower = address.toLowerCase();
  for (const [city, coords] of Object.entries(cityCoords)) {
    if (addressLower.includes(city)) {
      baseCoords = coords;
      break;
    }
  }

  // Add some randomness based on address hash
  const hash = address.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const latOffset = ((hash % 200) - 100) / 2000; // -0.05 to 0.05
  const lngOffset = (((hash * 7) % 200) - 100) / 2000; // -0.05 to 0.05
  
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
  const finalDistance = Math.max(Math.round(distance * randomFactor * 10) / 10, 1.5); // Minimum 1.5km
  
  return finalDistance;
};

const isWithinServiceArea = (coordinates) => {
  // Service area boundaries (India major cities)
  const serviceBounds = {
    north: 35.0, // Kashmir
    south: 8.0,  // Kerala
    east: 97.0,  // Arunachal Pradesh
    west: 68.0   // Gujarat
  };
  
  return (
    coordinates.latitude >= serviceBounds.south &&
    coordinates.latitude <= serviceBounds.north &&
    coordinates.longitude >= serviceBounds.west &&
    coordinates.longitude <= serviceBounds.east
  );
};

const findNearbyRiders = async (coordinates, rideType, radius = 10) => {
  // This would typically use MongoDB's geospatial queries
  // For now, returning mock nearby riders
  const Rider = require('../models/Rider');
  
  try {
    const riders = await Rider.find({
      vehicleType: rideType,
      'availability.isAvailable': true,
      status: 'approved',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [coordinates.longitude, coordinates.latitude]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    }).limit(10);

    return riders;
  } catch (error) {
    // Fallback to simple query if geospatial search fails
    const riders = await Rider.find({
      vehicleType: rideType,
      'availability.isAvailable': true,
      status: 'approved'
    }).limit(10);

    return riders;
  }
};

module.exports = {
  haversineDistance,
  generateMockCoordinates,
  calculateMockDistance,
  isWithinServiceArea,
  findNearbyRiders
};
