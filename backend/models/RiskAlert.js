const mongoose = require('mongoose');

const RiskAlertSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  vitals: Object,
  riskScore: Number,
  riskTier: String,
  message: String,
  status: { type: String, enum: ['ACTIVE', 'RESOLVED'], default: 'ACTIVE' }
}, { timestamps: true });

module.exports = mongoose.model('RiskAlert', RiskAlertSchema);
