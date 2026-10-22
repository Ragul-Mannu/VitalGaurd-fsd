const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

      const hashedPw = await bcrypt.hash('password123', 10);
      
      doctor = await Doctor.create({
        name: 'Dr. Sarah Connor',
        email: 'doctor@example.com',
        password: hashedPw,
        phone: process.env.DOCTOR_PHONE || '+1234567890',
        specialty: 'Cardiology'
      });
      
      patient = await Patient.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: hashedPw,
        age: 45,
        gender: 'Male',
        deviceId: 'DEV-001',
        assignedDoctorId: doctor._id
      });
      
      await Patient.create({
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: hashedPw,
        age: 62,
        gender: 'Female',
        deviceId: 'DEV-002',
        assignedDoctorId: doctor._id
      });
      
      await Patient.create({
        name: 'Robert Johnson',
        email: 'robert@example.com',
        password: hashedPw,
        age: 55,
        gender: 'Male',
        deviceId: 'DEV-003',
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

// Login Endpoint
app.post('/api/login', async (req, res) => {
  const { email, password, role } = req.body;
  
  try {
    if (role === 'admin') {
      // Admin is hardcoded to the user's email
      if (email === 'ragul@gmail.com' && password === 'admin123') {
        return res.json({ token: 'admin_token', role: 'admin', user: { name: 'Admin Ragul', email } });
      }
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    let user;
    if (role === 'doctor') user = await Doctor.findOne({ email });
    if (role === 'patient') user = await Patient.findOne({ email });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid password' });
    
    const token = jwt.sign({ id: user._id, role }, 'secret_key_rpm', { expiresIn: '1d' });
    res.json({ token, role, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const MONITORING_SYSTEM_POOL = process.env.SYSTEM_POOL 
  ? process.env.SYSTEM_POOL.split(',').map(s => s.trim()) 
  : ['DEV-001', 'DEV-002', 'DEV-003', 'DEV-004', 'DEV-005'];

async function getSystemAvailability() {
  const patients = await Patient.find({}, 'deviceId name');
  const occupiedMap = new Map();
  patients.forEach(p => {
    if (p.deviceId) occupiedMap.set(p.deviceId, p.name);
  });

  const occupiedDevices = MONITORING_SYSTEM_POOL
    .filter(devId => occupiedMap.has(devId))
    .map(devId => ({ deviceId: devId, patientName: occupiedMap.get(devId) }));

  const availableDevices = MONITORING_SYSTEM_POOL.filter(devId => !occupiedMap.has(devId));

  return {
    total: MONITORING_SYSTEM_POOL.length,
    occupiedCount: occupiedDevices.length,
    availableCount: availableDevices.length,
    isAvailable: availableDevices.length > 0,
    availableDevices,
    occupiedDevices
  };
}

// System Availability Endpoint
app.get('/api/systems/availability', async (req, res) => {
  try {
    const availability = await getSystemAvailability();
    res.json(availability);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all patients
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await Patient.find();
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new patient (with system availability enforcement)
app.post('/api/patients', async (req, res) => {
  try {
    const { name, email, password, age, gender, deviceId, assignedDoctorId } = req.body;

    const availability = await getSystemAvailability();

    // Enforce system availability: If no monitoring units are free, reject
    if (!availability.isAvailable) {
      return res.status(400).json({ 
        error: 'No monitoring systems available. All monitoring devices are currently occupied. Please discharge a patient to free up a system.' 
      });
    }

    const selectedDevice = deviceId || availability.availableDevices[0];

    // Check if the chosen device is already assigned to someone else
    const existingWithDevice = await Patient.findOne({ deviceId: selectedDevice });
    if (existingWithDevice) {
      return res.status(400).json({ 
        error: `Monitoring system ${selectedDevice} is already allocated to patient ${existingWithDevice.name}.` 
      });
    }

    let doctorIdToAssign = assignedDoctorId;
    if (!doctorIdToAssign) {
      const defaultDoc = await Doctor.findOne();
      if (defaultDoc) doctorIdToAssign = defaultDoc._id;
    }

    const hashedPw = await bcrypt.hash(password || 'password123', 10);
    const newPatient = await Patient.create({
      name, 
      email, 
      password: hashedPw, 
      age, 
      gender, 
      deviceId: selectedDevice, 
      assignedDoctorId: doctorIdToAssign
    });

    // Broadcast updated system availability to all connected dashboards
    const updatedAvailability = await getSystemAvailability();
    io.emit('system_availability_updated', updatedAvailability);

    res.json(newPatient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Discharge patient and release monitoring system
app.delete('/api/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const freedDevice = patient.deviceId;
    await Patient.findByIdAndDelete(req.params.id);
    await VitalsLog.deleteMany({ patientId: req.params.id });
    await RiskAlert.deleteMany({ patientId: req.params.id });

    const updatedAvailability = await getSystemAvailability();
    io.emit('system_availability_updated', updatedAvailability);
    io.emit('patient_discharged', { patientId: req.params.id, freedDevice });

    res.json({ 
      message: `Patient ${patient.name} discharged successfully. Device ${freedDevice} is now available.`, 
      freedDevice 
    });
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
