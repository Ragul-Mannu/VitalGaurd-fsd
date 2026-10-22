const mongoose = require('mongoose');

const DoctorSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: { type: String, required: true },
  phone: String,
  specialty: String,
  socketId: String // Track active connection
}, { timestamps: true });

module.exports = mongoose.model('Doctor', DoctorSchema);
