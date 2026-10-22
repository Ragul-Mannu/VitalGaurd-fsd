const mongoose = require('mongoose');
require('dotenv').config();
const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rpm_db').then(async () => {
  await Patient.deleteMany();
  await Doctor.deleteMany();
  console.log('Cleared DB, ready for re-init');
  process.exit(0);
});
