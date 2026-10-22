import React, { useState } from 'react';
import { Activity, User, Stethoscope, Settings, Lock, Mail, ArrowRight } from 'lucide-react';

export default function Login({ onLogin }) {
  const [activeTab, setActiveTab] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: activeTab })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      onLogin(activeTab, data.user);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'patient', label: 'Patient', icon: <User size={18} /> },
    { id: 'doctor', label: 'Doctor', icon: <Stethoscope size={18} /> },
    { id: 'admin', label: 'Admin', icon: <Settings size={18} /> }
  ];

  return (
    <div className="min-h-screen w-screen flex bg-brand-50 font-sans">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-primary rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-xl bg-brand-primary flex items-center justify-center shadow-md">
              <Activity size={28} className="text-white" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Vital<span className="font-light text-brand-300">Stream</span></h1>
          </div>
          
          <div className="max-w-md mt-20">
            <h2 className="text-5xl font-bold leading-tight mb-6">Real-time health monitoring, redefined.</h2>
            <p className="text-brand-300 text-lg leading-relaxed mb-8">
              Seamlessly connect patients with healthcare providers through advanced telemetry and AI-driven risk analysis.
            </p>
            <div className="flex gap-4">
              <div className="flex -space-x-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`w-12 h-12 rounded-full border-2 border-brand-900 bg-brand-${i * 100} flex items-center justify-center overflow-hidden`}>
                     <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" className="w-full h-full object-cover"/>
                  </div>
                ))}
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-white font-semibold">Trusted by 10k+</span>
                <span className="text-brand-400 text-sm">Healthcare professionals</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-brand-400 text-sm">
          &copy; 2026 VitalStream Technologies. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="max-w-md w-full space-y-8">
          
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-brand-900 tracking-tight">Welcome back</h2>
            <p className="text-brand-500 mt-2">Please sign in to your account</p>
          </div>

          {/* Role Selection Tabs */}
          <div className="flex p-1 space-x-1 bg-brand-200/50 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200
                  ${activeTab === tab.id 
                    ? 'bg-white text-brand-900 shadow-sm' 
                    : 'text-brand-600 hover:text-brand-900 hover:bg-brand-100/50'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-6 mt-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1.5">Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-brand-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white text-brand-900 placeholder-brand-400 transition-colors shadow-sm"
                    placeholder={`admin@${activeTab}.com`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-brand-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary bg-white text-brand-900 placeholder-brand-400 transition-colors shadow-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-brand-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-brand-600 cursor-pointer">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-brand-primary hover:text-brand-primaryDark transition-colors">
                  Forgot password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primaryDark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-all duration-200 disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-brand-500">
            Don't have an account?{' '}
            <a href="#" className="font-medium text-brand-primary hover:text-brand-primaryDark transition-colors">
              Contact support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
