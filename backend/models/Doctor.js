const mongoose = require('mongoose');

const DoctorSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  specialty: String,
  socketId: String // Track active connection
}, { timestamps: true });

module.exports = mongoose.model('Doctor', DoctorSchema);
