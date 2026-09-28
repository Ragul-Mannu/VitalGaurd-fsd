import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { User, Activity, CheckCircle2 } from 'lucide-react';

export default function PatientView() {
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/init')
      .then(res => res.json())
      .then(data => {
        setPatient(data.patient);
        return fetch(`http://localhost:5000/api/patient/${data.patientId}/state`);
      })
      .then(res => res.json())
      .then(stateData => {
        if (stateData.vitalsHistory) {
          const formatted = stateData.vitalsHistory.reverse().map(v => ({
            time: new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ...v
          }));
          setHistory(formatted);
        }
        setIsLoading(false);
      });
  }, []);

  if (isLoading) return <div className="p-10 text-center text-brand-500 font-medium">Loading your records...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10 h-full overflow-y-auto bg-brand-50">
      
      <div className="glass-panel p-8 mb-8 flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center shadow-sm">
          <User size={40} className="text-brand-500" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-brand-900">{patient?.name}</h2>
          <p className="text-brand-500 font-medium mt-1">Age: {patient?.age} &nbsp;|&nbsp; Gender: {patient?.gender} &nbsp;|&nbsp; ID: {patient?._id}</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-state-successLight text-state-success rounded-full text-sm font-semibold border border-state-successBorder shadow-sm">
            <CheckCircle2 size={16} /> Device {patient?.deviceId} Active
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-brand-900 mb-6 flex items-center gap-3">
        <Activity className="text-brand-primary" size={24} /> My Vitals History
      </h3>

      <div className="glass-panel p-8 h-[400px]">
        {history.length === 0 ? (
          <div className="h-full flex items-center justify-center text-brand-500 font-medium">No historical data recorded yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" stroke="#94a3b8" domain={[40, 180]} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" domain={[80, 100]} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)'}} 
                itemStyle={{color: '#0f172a', fontWeight: '500'}}
                labelStyle={{color: '#64748b', marginBottom: '4px'}}
              />
              <Line yAxisId="left" type="monotone" name="Heart Rate" dataKey="heartRate" stroke="#2563eb" strokeWidth={3} dot={false} />
              <Line yAxisId="right" type="monotone" name="SpO2 %" dataKey="spO2" stroke="#16a34a" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}
