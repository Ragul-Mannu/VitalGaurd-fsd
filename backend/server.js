const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');
const VitalsLog = require('./models/VitalsLog');
const RiskAlert = require('./models/RiskAlert');
const Notification = require('./models/Notification');
const twilioService = require('./services/twilioService');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const activeDoctors = new Map(); // Track connected doctors for SMS fallback

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rpm_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialization endpoint
app.get('/api/init', async (req, res) => {
  try {
    let doctor = await Doctor.findOne();
    let patient = await Patient.findOne();

    if (!doctor || !patient) {
      await Patient.deleteMany();
      await Doctor.deleteMany();
      await RiskAlert.deleteMany();
      await VitalsLog.deleteMany();

      doctor = await Doctor.create({
        name: 'Dr. Sarah Connor',
        email: 'sarah@example.com',
        phone: process.env.DOCTOR_PHONE || '+1234567890',
        specialty: 'Cardiology'
      });

      patient = await Patient.create({
        name: 'John Doe',
        age: 45,
        gender: 'Male',
        deviceId: 'DEV-001',
        assignedDoctorId: doctor._id
      });
    } else {
      // Sync the existing doctor's phone number with the latest .env configuration
      const envPhone = process.env.DOCTOR_PHONE || '+1234567890';
      if (doctor.phone !== envPhone) {
        await Doctor.findByIdAndUpdate(doctor._id, { phone: envPhone });
        doctor.phone = envPhone;
      }
    }

    res.json({ message: 'Initialized successfully', doctorId: doctor._id, patientId: patient._id, patient, doctor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current patient state (vitals + active alerts)
app.get('/api/patient/:id/state', async (req, res) => {
  try {
    const latestVitals = await VitalsLog.findOne({ patientId: req.params.id }).sort({ timestamp: -1 });
    const activeAlerts = await RiskAlert.find({ patientId: req.params.id, status: 'ACTIVE' }).sort({ createdAt: -1 });
    const vitalsHistory = await VitalsLog.find({ patientId: req.params.id }).sort({ timestamp: -1 }).limit(50);
    
    res.json({ latestVitals, activeAlerts, vitalsHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resolve an alert
app.post('/api/alerts/:id/resolve', async (req, res) => {
  try {
    const alert = await RiskAlert.findByIdAndUpdate(req.params.id, { status: 'RESOLVED' }, { new: true });
    io.emit('alert_resolved', { alertId: alert._id });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socket.IO logic
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Doctor connects
  socket.on('register_doctor', async (data) => {
    const { doctorId } = data;
    if (doctorId) {
      activeDoctors.set(doctorId, socket.id);
      await Doctor.findByIdAndUpdate(doctorId, { socketId: socket.id });
      console.log(`Doctor ${doctorId} registered`);
      socket.join(`doctor_${doctorId}`);
    }
  });

  // Simulator stream
  socket.on('vitals_stream', async (data) => {
    const { patientId, vitals } = data;
    if (!patientId || !vitals) return;

    try {
      const log = await VitalsLog.create({ patientId, ...vitals });
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/analyze`, { vitals });
      const riskData = aiResponse.data;

      const patient = await Patient.findById(patientId);
      if (!patient) return;
      const doctorId = patient.assignedDoctorId.toString();

      const streamPayload = {
        patientId,
        vitals,
        risk: riskData,
        timestamp: log.timestamp
      };
      
      io.emit('vitals_update_all', streamPayload);

      if (riskData.tier === 'CRITICAL' || riskData.tier === 'WARNING') {
        const recentAlert = await RiskAlert.findOne({ patientId, status: 'ACTIVE', riskTier: riskData.tier });
        
        let alert;
        if (!recentAlert) {
          alert = await RiskAlert.create({
            patientId,
            vitals,
            riskScore: riskData.score,
            riskTier: riskData.tier,
            message: riskData.message,
            status: 'ACTIVE'
          });
          
          io.emit('critical_alert_all', { alert, patient });

          const doctorSocket = activeDoctors.get(doctorId);
          const docRecord = await Doctor.findById(doctorId);
          
          if (!doctorSocket && docRecord) {
            const msg = `URGENT: Patient ${patient.name} is in ${riskData.tier} condition. ${riskData.message}. Please review.`;
            await twilioService.sendSMS(doctorId, patientId, alert._id, docRecord.phone, msg);
          } else {
            await Notification.create({
              doctorId, patientId, alertId: alert._id, method: 'WEBSOCKET', status: 'DELIVERED', message: riskData.message
            });
          }
        }
      }
    } catch (err) {
      console.error('Error processing vitals stream:', err.message);
    }
  });

  socket.on('disconnect', () => {
    for (const [docId, sockId] of activeDoctors.entries()) {
      if (sockId === socket.id) {
        activeDoctors.delete(docId);
        Doctor.findByIdAndUpdate(docId, { socketId: null }).exec();
        console.log(`Doctor ${docId} disconnected`);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
