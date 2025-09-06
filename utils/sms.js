// utils/sms.js - SMS Service
const twilio = require('twilio');
const logger = require('./logger');

class SMSService {
  constructor() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
      logger.warn('Twilio not configured, SMS service will use mock mode');
    }
  }

  async sendOTP(phoneNumber, otp) {
    try {
      if (!this.isConfigured) {
        logger.info(`[MOCK SMS] OTP ${otp} sent to ${phoneNumber}`);
        return { success: true, mock: true };
      }

      const message = `Your QuickRide OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.`;
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: `+91${phoneNumber}`
      });

      logger.info(`SMS sent successfully to ${phoneNumber}, SID: ${result.sid}`);
      return { success: true, sid: result.sid };

    } catch (error) {
      logger.error(`SMS sending failed for ${phoneNumber}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async sendRideConfirmation(phoneNumber, rideDetails) {
    try {
      if (!this.isConfigured) {
        logger.info(`[MOCK SMS] Ride confirmation sent to ${phoneNumber}:`, rideDetails);
        return { success: true, mock: true };
      }

      const message = `Ride confirmed! ${rideDetails.rideId}
Pickup: ${rideDetails.pickup}
Drop: ${rideDetails.drop}
Rider: ${rideDetails.riderName} (${rideDetails.riderPhone})
Vehicle: ${rideDetails.vehicleNumber}`;
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: `+91${phoneNumber}`
      });

      logger.info(`Ride confirmation SMS sent to ${phoneNumber}, SID: ${result.sid}`);
      return { success: true, sid: result.sid };

    } catch (error) {
      logger.error(`Ride confirmation SMS failed for ${phoneNumber}:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SMSService();

// ===========================================
