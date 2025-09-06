{
  "name": "quickride-backend",
  "version": "1.0.0",
  "description": "Backend API for QuickRide - Rapido clone ride booking application",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "seed": "node scripts/seedData.js"
  },
  "keywords": [
    "ride-booking",
    "taxi",
    "bike-booking",
    "transportation",
    "nodejs",
    "express",
    "mongodb"
  ],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1",
    "express-rate-limit": "^6.10.0",
    "express-validator": "^7.0.1",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "compression": "^1.7.4",
    "nodemailer": "^6.9.4",
    "twilio": "^4.15.0",
    "socket.io": "^4.7.2",
    "redis": "^4.6.8",
    "multer": "^1.4.5-lts.1",
    "cloudinary": "^1.40.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.4",
    "supertest": "^6.3.3",
    "@types/jest": "^29.5.5"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}