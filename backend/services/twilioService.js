const twilio = require('twilio');
const Notification = require('../models/Notification');

class TwilioService {
  constructor() {
    // In a real app, these come from process.env
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC_dummy_sid';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || 'dummy_token';
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || '+1234567890';
    
    // We only initialize the client if we have real credentials, 
    // otherwise we just mock it for the test
    if (this.accountSid !== 'AC_dummy_sid') {
      this.client = twilio(this.accountSid, this.authToken);
    }
  }

  async sendSMS(doctorId, patientId, alertId, toPhone, message) {
    try {
      console.log(`[SMS] Attempting to send SMS to ${toPhone}: ${message}`);
      
      let status = 'DELIVERED';
      if (this.client) {
        await this.client.messages.create({
          body: message,
          from: this.fromNumber,
          to: toPhone
        });
      } else {
        console.log(`[SMS] MOCKED delivery to ${toPhone} (no credentials)`);
        status = 'MOCKED_DELIVERED';
      }

      await Notification.create({
        doctorId,
        patientId,
        alertId,
        method: 'SMS',
        status,
        message
      });

      return true;
    } catch (error) {
      console.error('[SMS] Error sending SMS:', error);
      await Notification.create({
        doctorId,
        patientId,
        alertId,
        method: 'SMS',
        status: 'FAILED',
        message
      });
      return false;
    }
  }
}

module.exports = new TwilioService();
