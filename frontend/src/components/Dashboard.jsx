import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Heart, Thermometer, Droplets, User, Bell, CheckCircle2, AlertTriangle, XOctagon, Check, Plus, Cpu, Trash2, ShieldAlert } from 'lucide-react';
import AddPatientModal from './AddPatientModal';

export default function Dashboard() {
  const [dataPoints, setDataPoints] = useState([]);
  const [currentVitals, setCurrentVitals] = useState({ heartRate: '--', spO2: '--', systolicBP: '--', temperature: '--' });
  const [alerts, setAlerts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patient, setPatient] = useState(null);
  const [riskTier, setRiskTier] = useState('NORMAL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [availability, setAvailability] = useState(null);
  const socketRef = useRef(null);
  const activePatientIdRef = useRef(null);

  const fetchAvailability = () => {
    fetch('http://localhost:5000/api/systems/availability')
      .then(res => res.json())
      .then(data => setAvailability(data))
      .catch(err => console.error('Error fetching system availability:', err));
  };

  const loadPatientState = (p) => {
    setPatient(p);
    activePatientIdRef.current = p._id;
    
    // Reset view
    setCurrentVitals({ heartRate: '--', spO2: '--', systolicBP: '--', temperature: '--' });
    setAlerts([]);
    setDataPoints([]);
    setRiskTier('NORMAL');

    fetch(`http://localhost:5000/api/patient/${p._id}/state`)
      .then(res => res.json())
      .then(stateData => {
        if (stateData.latestVitals) setCurrentVitals(stateData.latestVitals);
        if (stateData.activeAlerts.length > 0) {
          setAlerts(stateData.activeAlerts);
          if (stateData.activeAlerts.some(a => a.riskTier === 'CRITICAL')) setRiskTier('CRITICAL');
          else setRiskTier('WARNING');
        }
        if (stateData.vitalsHistory) {
          const formatted = stateData.vitalsHistory.reverse().map(v => ({
            time: new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second:'2-digit' }),
            ...v
          }));
          setDataPoints(formatted);
        }
      });
  };

  const dischargePatient = async (patientId, e) => {
    if (e) e.stopPropagation();
    const pObj = patients.find(p => p._id === patientId);
    const confirmName = pObj ? pObj.name : 'this patient';
    if (!window.confirm(`Discharge ${confirmName} and free up monitoring system (${pObj?.deviceId})?`)) return;

    try {
      const res = await fetch(`http://localhost:5000/api/patients/${patientId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to discharge patient');
      
      setPatients(prev => {
        const next = prev.filter(p => p._id !== patientId);
        if (activePatientIdRef.current === patientId) {
          if (next.length > 0) loadPatientState(next[0]);
          else {
            setPatient(null);
            activePatientIdRef.current = null;
            setCurrentVitals({ heartRate: '--', spO2: '--', systolicBP: '--', temperature: '--' });
            setAlerts([]);
            setDataPoints([]);
          }
        }
        return next;
      });
      fetchAvailability();
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');
    
    fetchAvailability();

    fetch('http://localhost:5000/api/init')
      .then(res => res.json())
      .then(data => {
        socketRef.current.emit('register_doctor', { doctorId: data.doctorId });
        
        fetch('http://localhost:5000/api/patients')
          .then(res => res.json())
          .then(pts => {
            setPatients(pts);
            if (pts.length > 0) {
              loadPatientState(pts[0]);
            }
          });
      });

    socketRef.current.on('vitals_update_all', (data) => {
      const { vitals, risk, timestamp, patientId } = data;
      if (patientId !== activePatientIdRef.current) return;

      setCurrentVitals(vitals);
      
      setRiskTier(prev => {
        if (risk.tier === 'CRITICAL') return 'CRITICAL';
        if (risk.tier === 'WARNING' && prev !== 'CRITICAL') return 'WARNING';
        return prev; 
      });
      
      const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second:'2-digit' });
      setDataPoints(prev => {
        const newPoints = [...prev, { time: timeStr, ...vitals }];
        if (newPoints.length > 30) return newPoints.slice(newPoints.length - 30);
        return newPoints;
      });
    });

    socketRef.current.on('critical_alert_all', (data) => {
      if (data.patient._id !== activePatientIdRef.current) return;
      setAlerts(prev => [data.alert, ...prev]); 
      setRiskTier(data.alert.riskTier);
    });

    socketRef.current.on('alert_resolved', (data) => {
      setAlerts(prev => {
        const remaining = prev.filter(a => a._id !== data.alertId);
        if (remaining.length === 0) setRiskTier('NORMAL');
        else if (!remaining.some(a => a.riskTier === 'CRITICAL')) setRiskTier('WARNING');
        return remaining;
      });
    });

    socketRef.current.on('system_availability_updated', (newAvailability) => {
      setAvailability(newAvailability);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const resolveAlert = async (alertId) => {
    try {
      await fetch(`http://localhost:5000/api/alerts/${alertId}/resolve`, { method: 'POST' });
    } catch(e) { console.error(e); }
  };

  const getStatusConfig = (tier) => {
    switch(tier) {
      case 'CRITICAL': return { color: 'text-state-danger', bg: 'bg-state-dangerLight', border: 'border-state-dangerBorder', icon: <XOctagon className="w-8 h-8 text-state-danger" /> };
      case 'WARNING': return { color: 'text-state-warning', bg: 'bg-state-warningLight', border: 'border-state-warningBorder', icon: <AlertTriangle className="w-8 h-8 text-state-warning" /> };
      default: return { color: 'text-state-success', bg: 'bg-white', border: 'border-brand-200', icon: <CheckCircle2 className="w-8 h-8 text-state-success" /> };
    }
  };

  const status = getStatusConfig(riskTier);

  return (
    <div className="h-full w-full flex bg-brand-50 overflow-hidden">
      
      {/* Sidebar - System Availability & Patient List */}
      <div className="hidden md:flex w-72 flex-col bg-white border-r border-brand-200 shrink-0 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.05)] z-10">
        
        {/* System Monitoring Availability Widget */}
        <div className="p-3.5 mx-3 mt-3 mb-1 rounded-xl border bg-slate-50 border-slate-200/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Cpu size={14} className="text-brand-primary" /> Monitoring Systems
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${availability?.isAvailable ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
              {availability?.isAvailable ? `${availability?.availableCount} Available` : '0 Available (Full)'}
            </span>
          </div>

          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
            <div 
              className={`h-full transition-all duration-500 ${availability?.isAvailable ? 'bg-brand-primary' : 'bg-rose-500'}`}
              style={{ width: `${availability ? (availability.occupiedCount / availability.total) * 100 : 0}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
            <span>{availability?.occupiedCount || 0} Units In Use</span>
            <span>Total: {availability?.total || 5} Units</span>
          </div>
        </div>

        <div className="p-4 border-b border-brand-100 flex items-center justify-between bg-brand-50/50">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-brand-900">My Patients</h3>
            <span className="bg-brand-200 text-brand-700 text-xs py-0.5 px-2 rounded-full font-bold">{patients.length}</span>
          </div>
          <button 
            onClick={() => setShowAddModal(true)} 
            title={availability?.isAvailable ? 'Add Patient' : 'Monitoring system unavailable (0 units free)'}
            className={`p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs font-semibold ${
              availability?.isAvailable 
                ? 'bg-brand-primary text-white hover:bg-brand-primaryDark' 
                : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
            }`}
          >
            <Plus size={15} />
            <span className="hidden lg:inline text-[11px]">{availability?.isAvailable ? 'Add' : 'Full'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {patients.map((p) => {
            const isActive = patient?._id === p._id;
            return (
              <div 
                key={p._id} 
                onClick={() => loadPatientState(p)}
                className={`group p-3 rounded-xl cursor-pointer flex items-center justify-between transition-colors border 
                  ${isActive ? 'bg-brand-50 border-brand-200 shadow-sm' : 'border-transparent hover:border-brand-100 hover:bg-brand-50/50'}
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img src={`https://i.pravatar.cc/150?u=${p._id}`} className="w-9 h-9 rounded-full border border-brand-200" alt="patient"/>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white rounded-full ${isActive && riskTier === 'CRITICAL' ? 'bg-state-danger' : isActive && riskTier === 'WARNING' ? 'bg-state-warning' : 'bg-state-success'}`}></div>
                  </div>
                  <div className="min-w-0 truncate">
                    <div className="font-semibold text-brand-900 text-sm truncate">{p.name}</div>
                    <div className="text-[11px] text-brand-500 font-mono">Unit: {p.deviceId}</div>
                  </div>
                </div>

                <button 
                  onClick={(e) => dischargePatient(p._id, e)}
                  title={`Discharge ${p.name} & free up ${p.deviceId}`}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0 ml-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row p-6 lg:p-8 gap-8 overflow-y-auto">
        
        <div className="flex-1 flex flex-col gap-8 min-w-0">
        
        {/* Patient Status Header */}
        <div className={`glass-panel p-6 flex justify-between items-center border-l-4 ${status.border} ${riskTier !== 'NORMAL' ? status.bg : ''} transition-all duration-300`}>
          <div className="flex items-center gap-5">
            <div className="bg-brand-50 p-4 rounded-full border border-brand-200">
              <User className="text-brand-500 w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-brand-900">{patient?.name || 'Loading Patient...'}</h2>
                {patient && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <Cpu size={12} /> System: {patient.deviceId}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-brand-500 text-sm font-medium">
                  Patient ID: {patient?._id || '--'} &nbsp;|&nbsp; Unit: <span className="font-mono font-bold text-brand-700">{patient?.deviceId || '--'}</span>
                </p>
                {patient && (
                  <button 
                    onClick={() => dischargePatient(patient._id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                    title="Discharge this patient and free up the monitoring unit"
                  >
                    <Trash2 size={13} /> Discharge & Free Unit
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-1">Clinical Status</div>
              <div className={`text-2xl font-bold ${status.color}`}>
                {riskTier}
              </div>
            </div>
            <div className="ml-2">
              {status.icon}
            </div>
          </div>
        </div>

        {/* Vital Signs Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <VitalCard 
            title="Heart Rate" 
            value={currentVitals.heartRate} 
            unit="bpm" 
            icon={<Heart className="text-brand-primary w-5 h-5" />}
            isAbnormal={currentVitals.heartRate > 100 || currentVitals.heartRate < 50}
          />
          <VitalCard 
            title="Oxygen Saturation" 
            value={currentVitals.spO2} 
            unit="%" 
            icon={<Droplets className="text-brand-primary w-5 h-5" />}
            isAbnormal={currentVitals.spO2 < 92}
          />
          <VitalCard 
            title="Blood Pressure (Sys)" 
            value={currentVitals.systolicBP} 
            unit="mmHg" 
            icon={<Activity className="text-brand-primary w-5 h-5" />}
            isAbnormal={currentVitals.systolicBP > 140 || currentVitals.systolicBP < 90}
          />
          <VitalCard 
            title="Temperature" 
            value={currentVitals.temperature} 
            unit="°F" 
            icon={<Thermometer className="text-brand-primary w-5 h-5" />}
            isAbnormal={currentVitals.temperature > 100.4}
          />
        </div>

        {/* Live Telemetry Chart */}
        <div className="glass-panel p-6 flex-1 min-h-[350px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-brand-900">Live Telemetry Trend</h3>
            <div className="flex items-center gap-6 text-sm font-medium text-brand-600">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-brand-primary shadow-sm"></div> Heart Rate</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-state-success shadow-sm"></div> SpO2</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataPoints} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" stroke="#94a3b8" domain={[40, 200]} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" domain={[70, 100]} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)'}} 
                itemStyle={{color: '#0f172a', fontWeight: '500'}}
                labelStyle={{color: '#64748b', marginBottom: '4px'}}
              />
              <Line yAxisId="left" type="monotone" dataKey="heartRate" stroke="#2563eb" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line yAxisId="right" type="monotone" dataKey="spO2" stroke="#16a34a" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Clinical Alerts Sidebar */}
      <div className="w-full lg:w-[350px] shrink-0 glass-panel p-0 flex flex-col h-[500px] lg:h-[calc(100vh-8rem)] sticky top-0 overflow-hidden">
        <div className="p-6 border-b border-brand-100 bg-brand-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="text-brand-500 w-5 h-5" />
            <h3 className="text-lg font-semibold text-brand-900">Action Required</h3>
          </div>
          <span className="bg-brand-200 text-brand-700 text-xs py-1 px-3 rounded-full font-bold">{alerts.length} Active</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {alerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-brand-400">
              <CheckCircle2 className="w-16 h-16 mb-4 text-state-success opacity-20" />
              <p className="font-medium text-brand-500">No active alerts detected</p>
            </div>
          ) : (
            alerts.map((alert, idx) => (
              <div key={alert._id || idx} className={`p-5 rounded-xl border shadow-sm ${alert.riskTier === 'CRITICAL' ? 'border-state-dangerBorder bg-state-dangerLight' : 'border-state-warningBorder bg-state-warningLight'}`}>
                <div className="flex justify-between items-start mb-3">
                  <span className={`font-bold text-sm tracking-wide ${alert.riskTier === 'CRITICAL' ? 'text-state-danger' : 'text-state-warning'}`}>
                    {alert.riskTier} ALERT
                  </span>
                  <span className="text-xs font-medium text-brand-500">{new Date(alert.createdAt || Date.now()).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-brand-800 leading-relaxed mb-5 font-medium">{alert.message}</p>
                <button 
                  onClick={() => resolveAlert(alert._id)}
                  className="w-full py-2.5 bg-white hover:bg-brand-50 border border-brand-200 text-brand-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Check size={16} className="text-state-success" /> Mark as Resolved
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
      
      {showAddModal && (
        <AddPatientModal 
          onClose={() => setShowAddModal(false)}
          onAdd={(newPatient) => {
            setPatients([...patients, newPatient]);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function VitalCard({ title, value, unit, icon, isAbnormal }) {
  const textColor = isAbnormal ? 'text-state-danger' : 'text-brand-900';
  const labelColor = isAbnormal ? 'text-state-danger' : 'text-brand-500';
  
  return (
    <div className={`glass-panel p-6 flex flex-col justify-center relative transition-all duration-300 ${isAbnormal ? 'bg-state-dangerLight border-state-dangerBorder shadow-none' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`text-sm font-semibold tracking-wide ${labelColor}`}>{title}</div>
        <div className={`p-2 rounded-lg ${isAbnormal ? 'bg-state-danger/10 text-state-danger' : 'bg-brand-50 text-brand-500 border border-brand-100'}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5 mt-2">
        <span className={`text-4xl font-bold tracking-tight ${textColor}`}>{value}</span>
        <span className={`text-sm font-semibold ${isAbnormal ? 'text-state-danger/70' : 'text-brand-400'}`}>{unit}</span>
      </div>
    </div>
  );
}
