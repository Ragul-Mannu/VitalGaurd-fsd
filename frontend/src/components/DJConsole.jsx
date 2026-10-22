import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Play, Square, Activity, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function DJConsole() {
  const [vitals, setVitals] = useState({
    heartRate: 75,
    spO2: 98,
    systolicBP: 120,
    temperature: 98.6
  });
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [riskTier, setRiskTier] = useState('NORMAL');
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const socketRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');
    
    fetch('http://localhost:5000/api/patients')
      .then(res => res.json())
      .then(pts => {
        setPatients(pts);
        if (pts.length > 0) {
          setPatientId(pts[0]._id);
        }
      });

    socketRef.current.on('vitals_update_all', (data) => {
      setRiskTier(data.risk.tier);
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isStreaming) {
      intervalRef.current = setInterval(() => {
        sendData();
      }, 2000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isStreaming, vitals, patientId]);

  const sendData = () => {
    if (!patientId || !socketRef.current) return;
    
    const jitteredVitals = {
      heartRate: vitals.heartRate + (Math.random() * 2 - 1),
      spO2: Math.min(100, vitals.spO2 + (Math.random() * 0.5 - 0.25)),
      systolicBP: vitals.systolicBP + (Math.random() * 4 - 2),
      temperature: vitals.temperature + (Math.random() * 0.2 - 0.1)
    };

    socketRef.current.emit('vitals_stream', {
      patientId: patientId,
      vitals: {
        heartRate: parseFloat(jitteredVitals.heartRate.toFixed(1)),
        spO2: parseFloat(jitteredVitals.spO2.toFixed(1)),
        systolicBP: parseFloat(jitteredVitals.systolicBP.toFixed(1)),
        temperature: parseFloat(jitteredVitals.temperature.toFixed(1))
      }
    });
  };

  const handleSliderChange = (e) => {
    const { name, value } = e.target;
    setVitals(prev => ({ ...prev, [name]: parseFloat(value) }));
    if (!isStreaming) sendData();
  };

  const applyPreset = (preset) => {
    switch(preset) {
      case 'NORMAL':
        setVitals({ heartRate: 75, spO2: 98, systolicBP: 120, temperature: 98.6 });
        break;
      case 'TACHYCARDIA':
        setVitals({ heartRate: 145, spO2: 96, systolicBP: 135, temperature: 99.1 });
        break;
      case 'HYPOXIA':
        setVitals({ heartRate: 110, spO2: 82, systolicBP: 100, temperature: 98.0 });
        break;
      case 'DISCONNECT':
        setVitals({ heartRate: 0, spO2: 0, systolicBP: 0, temperature: 0 });
        break;
      default:
        break;
    }
    if (!isStreaming) sendData();
  };

  const getTierLedColor = () => {
    if (riskTier === 'CRITICAL') return 'bg-state-danger text-white border-state-danger shadow-md';
    if (riskTier === 'WARNING') return 'bg-state-warning text-white border-state-warning shadow-md';
    return 'bg-state-success text-white border-state-success shadow-md';
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-6 bg-brand-50 overflow-y-auto">
      <div className="glass-panel w-full max-w-4xl p-10 flex flex-col gap-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-brand-200 pb-8 gap-6">
          <div>
            <h2 className="text-2xl font-bold text-brand-900 flex items-center gap-3">
              <Activity className="text-brand-primary" size={28} />
              Vitals Simulation Panel
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-sm font-semibold text-brand-500">Target Patient:</span>
              <select 
                value={patientId} 
                onChange={(e) => setPatientId(e.target.value)}
                disabled={isStreaming}
                className="bg-white border border-brand-200 text-brand-900 text-sm rounded-lg focus:ring-brand-primary focus:border-brand-primary block p-2 font-medium"
              >
                {patients.map(p => (
                  <option key={p._id} value={p._id}>{p.name} ({p.deviceId})</option>
                ))}
              </select>
            </div>
            <p className="text-xs font-medium text-brand-400 mt-2">Select a patient to simulate data for. Cannot change while streaming.</p>
          </div>
          
          <div className="flex items-center gap-5 bg-brand-50 p-3 rounded-xl border border-brand-200 shadow-sm">
            <div className="flex flex-col px-4 border-r border-brand-200">
              <span className="text-[10px] text-brand-500 font-bold uppercase tracking-widest mb-1.5">AI Risk Engine Status</span>
              <div className={`px-4 py-1.5 rounded-md text-xs font-bold border transition-all duration-300 flex items-center gap-2 ${getTierLedColor()}`}>
                {riskTier === 'CRITICAL' && <ShieldAlert size={14} />}
                {riskTier === 'WARNING' && <AlertCircle size={14} />}
                {riskTier === 'NORMAL' && <CheckCircle2 size={14} />}
                {riskTier}
              </div>
            </div>
            
            <button 
              onClick={() => setIsStreaming(!isStreaming)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all mr-1 ${
                isStreaming 
                  ? 'bg-state-danger text-white shadow hover:bg-red-700' 
                  : 'bg-brand-primary text-white shadow hover:bg-brand-primaryDark'
              }`}
            >
              {isStreaming ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              {isStreaming ? 'Stop Streaming' : 'Start Simulation'}
            </button>
          </div>
        </div>

        {/* Sliders Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
          <ParameterSlider 
            label="Heart Rate" 
            name="heartRate"
            min={40} max={180} step={1} 
            value={vitals.heartRate} 
            unit="bpm"
            onChange={handleSliderChange}
          />
          <ParameterSlider 
            label="Oxygen Saturation (SpO2)" 
            name="spO2"
            min={70} max={100} step={1} 
            value={vitals.spO2} 
            unit="%"
            onChange={handleSliderChange}
          />
          <ParameterSlider 
            label="Systolic Blood Pressure" 
            name="systolicBP"
            min={80} max={200} step={1} 
            value={vitals.systolicBP} 
            unit="mmHg"
            onChange={handleSliderChange}
          />
          <ParameterSlider 
            label="Body Temperature" 
            name="temperature"
            min={95} max={104} step={0.1} 
            value={vitals.temperature} 
            unit="°F"
            onChange={handleSliderChange}
          />
        </div>

        {/* Preset Macros */}
        <div className="bg-brand-50 p-6 rounded-2xl border border-brand-200 mt-4">
          <div className="text-xs font-bold text-brand-500 uppercase tracking-wider mb-5">Clinical Scenario Presets</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <PresetButton onClick={() => applyPreset('NORMAL')} label="Healthy Baseline" />
            <PresetButton onClick={() => applyPreset('TACHYCARDIA')} label="Tachycardia Event" isWarning />
            <PresetButton onClick={() => applyPreset('HYPOXIA')} label="Hypoxia Crisis" isCritical />
            <PresetButton onClick={() => applyPreset('DISCONNECT')} label="Sensor Failure" isNeutral />
          </div>
        </div>

      </div>
    </div>
  );
}

function ParameterSlider({ label, name, min, max, step, value, unit, onChange }) {
  return (
    <div className="bg-white border border-brand-200 rounded-xl p-6 flex flex-col shadow-sm">
      <div className="flex justify-between items-end mb-6">
        <label className="text-sm font-semibold text-brand-700">{label}</label>
        <div className="text-right">
          <span className="text-3xl font-bold text-brand-900">{value}</span>
          <span className="text-sm font-semibold text-brand-400 ml-1.5">{unit}</span>
        </div>
      </div>

      <div className="w-full relative pt-2 pb-2">
        <input 
          type="range" 
          name={name}
          min={min} max={max} step={step} 
          value={value} 
          onChange={onChange}
          className="w-full h-2 bg-brand-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
        />
        <div className="flex justify-between text-xs text-brand-400 mt-3 font-semibold">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}

function PresetButton({ label, onClick, isWarning, isCritical, isNeutral }) {
  let colorClass = "bg-white text-brand-700 border-brand-200 hover:border-brand-primary hover:text-brand-primary";
  if (isWarning) colorClass = "bg-state-warningLight text-state-warning border-state-warningBorder hover:bg-orange-100";
  if (isCritical) colorClass = "bg-state-dangerLight text-state-danger border-state-dangerBorder hover:bg-red-100";
  if (isNeutral) colorClass = "bg-brand-100 text-brand-600 border-brand-200 hover:bg-brand-200";

  return (
    <button 
      onClick={onClick}
      className={`px-4 py-3 rounded-lg border transition-all text-sm font-semibold shadow-sm ${colorClass}`}
    >
      {label}
    </button>
  );
}
