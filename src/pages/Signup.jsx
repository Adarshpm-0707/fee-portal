import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Lock, Mail, ArrowLeft, AlertCircle, UserPlus, CheckCircle, User } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const { signupAdmin, isFirebaseConfigured } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all details.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await signupAdmin(email.trim(), password, name.trim());
      setSuccess('Account created successfully! Redirecting...');
      alert('Administrator account registered successfully!');
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to register administrator account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-[-20%] left-[-15%] w-[55%] h-[55%] bg-rose-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-15%] w-[55%] h-[55%] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-md w-full z-10">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('/login')} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6 text-sm font-semibold group cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Admin Login
        </button>

        {/* Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl">
          
          {/* Logo Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
              <UserPlus className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 text-center">Admin Registration</h2>
            <p className="text-slate-500 text-xs text-center mt-1 font-light">
              Create a new administrator account.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-105 text-rose-700 p-3.5 rounded-xl text-xs font-light flex items-start gap-2 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-emerald-50 border border-emerald-100 text-emerald-700 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="John Doe"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all font-light"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@school.com"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all font-light"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Master Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="6"
                  placeholder="•••••••• (Min 6 chars)"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all font-light"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength="6"
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all font-light"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-rose-600/10 flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  <span>Registering...</span>
                </>
              ) : (
                'Register Administrator'
              )}
            </button>

          </form>

          {/* Quick Sandbox Help Info */}
          {!isFirebaseConfigured && (
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <span className="text-[10px] text-indigo-600 font-bold block mb-1">
                💡 SANDBOX MODE ACTIVE
              </span>
              <span className="text-[10px] text-slate-400 font-light block leading-normal">
                Registered administrator accounts will be saved locally in your browser's local storage database.
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
