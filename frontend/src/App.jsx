import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import DJConsole from './components/DJConsole';
import PatientView from './components/PatientView';
import Login from './components/Login';
import { Activity, LogOut, Bell, Search } from 'lucide-react';

function App() {
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);

  const handleLogin = (r, u) => {
    setRole(r);
    setUser(u);
  };

  if (!role) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen w-screen bg-brand-50 text-brand-900 flex flex-col font-sans overflow-hidden">
      <nav className="h-16 border-b border-brand-200 bg-white flex items-center justify-between px-8 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setRole(null)}>
          <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center shadow-sm group-hover:bg-brand-primaryDark transition-colors">
            <Activity size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-brand-900 hidden sm:block">Vital<span className="font-light text-brand-500">Stream</span></h1>
        </div>
        
        <div className="flex-1 max-w-xl px-8 hidden md:block">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-brand-400" />
            </div>
            <input
              type="text"
              placeholder="Search patients, alerts..."
              className="block w-full pl-10 pr-3 py-2 border border-brand-200 rounded-lg bg-brand-50 text-sm focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md bg-brand-100 text-brand-700 text-xs font-semibold capitalize border border-brand-200">
            {role} Portal
          </span>
          
          <button className="relative p-2 text-brand-400 hover:text-brand-600 transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-state-danger rounded-full border border-white"></span>
          </button>

          <div className="h-8 w-px bg-brand-200 hidden sm:block"></div>

          <div className="flex items-center gap-3">
            <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" className="w-8 h-8 rounded-full border border-brand-200" />
            <div className="hidden sm:block text-sm">
              <p className="font-semibold text-brand-900 leading-none mb-1">
                {user?.name || 'Loading...'}
              </p>
              <p className="text-brand-500 text-xs leading-none capitalize">{role}</p>
            </div>
          </div>

          <button 
            onClick={() => { setRole(null); setUser(null); }} 
            className="p-2 text-brand-400 hover:text-state-danger hover:bg-state-dangerLight rounded-lg transition-colors ml-2"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="flex-1 relative overflow-hidden">
        {role === 'patient' && <PatientView user={user} />}
        {role === 'doctor' && <Dashboard />}
        {role === 'admin' && <DJConsole />}
      </main>
    </div>
  );
}



export default App;
