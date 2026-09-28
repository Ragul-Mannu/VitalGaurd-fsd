require('dotenv').config({ path: './.env' });
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;
const toNumber = process.env.DOCTOR_PHONE;

console.log(`Sending from ${fromNumber} to ${toNumber}...`);

const client = twilio(accountSid, authToken);

client.messages
  .create({
    body: 'Test message from RPM Platform',
    from: fromNumber,
    to: toNumber
  })
  .then(message => console.log('Success! Message SID:', message.sid))
  .catch(error => {
    console.error('Twilio Error Code:', error.code);
    console.error('Twilio Error Message:', error.message);
  });
