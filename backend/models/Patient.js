const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  name: String,
  age: Number,
  gender: String,
  deviceId: String,
  assignedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }
}, { timestamps: true });

module.exports = mongoose.model('Patient', PatientSchema);
