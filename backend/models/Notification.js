const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  alertId: { type: mongoose.Schema.Types.ObjectId, ref: 'RiskAlert' },
  method: { type: String, enum: ['WEBSOCKET', 'SMS'] },
  status: String,
  message: String
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
