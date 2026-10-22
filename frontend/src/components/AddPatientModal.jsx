import React, { useState, useEffect } from 'react';
import { X, Cpu, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function AddPatientModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    gender: 'Male',
    deviceId: ''
  });
  const [availability, setAvailability] = useState(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/systems/availability')
      .then(res => res.json())
      .then(data => {
        setAvailability(data);
        if (data.availableDevices && data.availableDevices.length > 0) {
          setFormData(prev => ({ ...prev, deviceId: data.availableDevices[0] }));
        }
        setIsLoadingAvailability(false);
      })
      .catch(err => {
        console.error('Failed to check system availability:', err);
        setIsLoadingAvailability(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (availability && !availability.isAvailable) {
      setErrorMessage('Monitoring system is not available. Cannot add patient.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add patient');
      onAdd(data);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSystemAvailable = availability ? availability.isAvailable : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-brand-100">
          <div>
            <h2 className="text-xl font-bold text-brand-900">Add New Patient</h2>
            <p className="text-xs text-brand-500 mt-0.5">Allocate an active monitoring system unit</p>
          </div>
          <button onClick={onClose} className="text-brand-400 hover:text-state-danger transition-colors p-1 rounded-lg hover:bg-state-dangerLight">
            <X size={20} />
          </button>
        </div>

        {/* System Availability Banner */}
        <div className="px-6 pt-5">
          {isLoadingAvailability ? (
            <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-600 flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
              Checking monitoring system availability...
            </div>
          ) : isSystemAvailable ? (
            <div className="p-3.5 bg-state-successLight/60 border border-state-successBorder rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-state-success shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-state-success uppercase tracking-wider">
                  System Available ({availability.availableCount} / {availability.total} Free)
                </div>
                <div className="text-xs text-brand-700 mt-0.5">
                  Monitoring capacity available. Select a device below to link telemetry.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-state-dangerLight border border-state-dangerBorder rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-state-danger shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-state-danger uppercase tracking-wider">
                  System Unavailable (0 / {availability?.total || 5} Available)
                </div>
                <div className="text-xs text-state-danger font-medium mt-0.5">
                  All monitoring systems are occupied by active patients. Discharge a patient to free up a system before adding new ones.
                </div>
              </div>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-brand-700 mb-1">Full Name</label>
              <input 
                required 
                disabled={!isSystemAvailable || isLoadingAvailability}
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="w-full px-3 py-2 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:bg-gray-100 disabled:text-gray-400" 
                placeholder="John Doe" 
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-brand-700 mb-1">Email</label>
              <input 
                required 
                disabled={!isSystemAvailable || isLoadingAvailability}
                type="email" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                className="w-full px-3 py-2 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:bg-gray-100 disabled:text-gray-400" 
                placeholder="john@example.com" 
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-brand-700 mb-1">Temporary Password</label>
              <input 
                required 
                disabled={!isSystemAvailable || isLoadingAvailability}
                type="password" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                className="w-full px-3 py-2 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:bg-gray-100 disabled:text-gray-400" 
                placeholder="••••••••" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-700 mb-1">Age</label>
              <input 
                required 
                disabled={!isSystemAvailable || isLoadingAvailability}
                type="number" 
                value={formData.age} 
                onChange={e => setFormData({...formData, age: e.target.value})} 
                className="w-full px-3 py-2 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:bg-gray-100 disabled:text-gray-400" 
                placeholder="45" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-700 mb-1">Gender</label>
              <select 
                disabled={!isSystemAvailable || isLoadingAvailability}
                value={formData.gender} 
                onChange={e => setFormData({...formData, gender: e.target.value})} 
                className="w-full px-3 py-2 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-brand-700 mb-1 flex items-center justify-between">
                <span>Allocated Monitoring System (Device)</span>
                <span className="text-xs font-normal text-brand-500 flex items-center gap-1">
                  <Cpu size={13} /> Hardware Unit
                </span>
              </label>

              {isSystemAvailable && availability?.availableDevices?.length > 0 ? (
                <select 
                  required
                  value={formData.deviceId}
                  onChange={e => setFormData({...formData, deviceId: e.target.value})}
                  className="w-full px-3 py-2 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-mono text-sm bg-brand-50/50"
                >
                  {availability.availableDevices.map(devId => (
                    <option key={devId} value={devId}>
                      {devId} (Ready / Unassigned)
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 border border-state-dangerBorder rounded-lg bg-red-50 text-state-danger text-sm font-semibold flex items-center justify-between">
                  <span>No Systems Available</span>
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">All Units In Use</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-brand-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || isLoadingAvailability || !isSystemAvailable} 
              className="px-5 py-2 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primaryDark rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              ) : null}
              {!isSystemAvailable && !isLoadingAvailability
                ? 'System Unavailable' 
                : 'Add Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
