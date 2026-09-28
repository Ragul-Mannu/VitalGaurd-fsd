const mongoose = require('mongoose');

const VitalsLogSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  heartRate: Number,
  spO2: Number,
  systolicBP: Number,
  temperature: Number,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VitalsLog', VitalsLogSchema);
