import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import DJConsole from './components/DJConsole';
import PatientView from './components/PatientView';
import { Activity, User, Stethoscope, Settings } from 'lucide-react';

function App() {
  const [role, setRole] = useState(null);

  if (!role) {
    return (
      <div className="h-screen w-screen bg-brand-50 flex flex-col items-center justify-center p-6 text-brand-900">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-xl bg-brand-primary flex items-center justify-center shadow-md">
            <Activity size={28} className="text-white" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-brand-900">Vital<span className="font-light text-brand-500">Stream</span></h1>
        </div>

        <div className="glass-panel p-10 max-w-4xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          <RoleCard 
            icon={<User size={32} />} 
            title="Patient Portal" 
            desc="View your health records and history."
            onClick={() => setRole('patient')}
          />
          <RoleCard 
            icon={<Stethoscope size={32} />} 
            title="Doctor Dashboard" 
            desc="Monitor patients and resolve critical alerts."
            onClick={() => setRole('doctor')}
          />
          <RoleCard 
            icon={<Settings size={32} />} 
            title="Admin Simulator" 
            desc="Inject telemetry data to test the RPM system."
            onClick={() => setRole('admin')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-brand-50 text-brand-900 flex flex-col font-sans overflow-hidden">
      <nav className="h-16 border-b border-brand-200 bg-white flex items-center justify-between px-8 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setRole(null)}>
          <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center shadow-sm group-hover:bg-brand-primaryDark transition-colors">
            <Activity size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-brand-900">Vital<span className="font-light text-brand-500">Stream</span></h1>
        </div>
        
        <div className="flex items-center gap-6">
          <span className="text-sm text-brand-600 capitalize font-semibold px-3 py-1 bg-brand-50 rounded-md border border-brand-200">
            {role} View
          </span>
          <button onClick={() => setRole(null)} className="text-sm font-medium text-brand-500 hover:text-brand-900 transition-colors">
            Switch Role
          </button>
        </div>
      </nav>

      <main className="flex-1 relative overflow-hidden">
        {role === 'patient' && <PatientView />}
        {role === 'doctor' && <Dashboard />}
        {role === 'admin' && <DJConsole />}
      </main>
    </div>
  );
}

function RoleCard({ icon, title, desc, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white border border-brand-200 p-8 rounded-2xl cursor-pointer hover:border-brand-primary hover:shadow-lg transition-all duration-300 text-center flex flex-col items-center group"
    >
      <div className="p-5 bg-brand-50 rounded-full text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all duration-300 mb-5">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-brand-900 mb-2">{title}</h3>
      <p className="text-sm text-brand-500 leading-relaxed">{desc}</p>
    </div>
  );
}

export default App;
