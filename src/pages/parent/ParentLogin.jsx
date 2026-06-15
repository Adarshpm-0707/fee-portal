import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { GraduationCap, UserCheck, Key, ArrowLeft, AlertCircle } from 'lucide-react';

export default function ParentLogin() {
  const navigate = useNavigate();
  const { loginParent, isFirebaseConfigured } = useAuth();

  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contact) {
      setError('Please provide your registered mobile number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await loginParent(contact.trim());
      navigate('/parent/fees');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Verification failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-15%] w-[55%] h-[55%] bg-rose-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-15%] w-[55%] h-[55%] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-md w-full z-10">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6 text-sm font-semibold group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Portal Selector
        </button>

        {/* Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl">
          
          {/* Logo Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-655 mb-4 shadow-sm">
              <UserCheck className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 text-center">Parent Fee Portal</h2>
            <p className="text-slate-505 text-xs text-center mt-1 font-light">
              Enter your registered mobile number to check fee statuses.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-rose-550/5 border border-rose-100 text-rose-600 p-3.5 rounded-xl text-xs font-light flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Parent Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Registered Mobile Number</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">+91</span>
                <input 
                  type="tel" 
                  pattern="[0-9]{10}"
                  maxLength="10"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                  placeholder="98765 43210"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-505 rounded-xl pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-light"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  <span>Verifying Mobile Number...</span>
                </>
              ) : (
                'Log In to Dashboard'
              )}
            </button>

          </form>

          {/* Quick Sandbox Help Info */}
          {!isFirebaseConfigured && (
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block mb-2">Sandbox Demo Access</span>
              <div className="inline-block bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-left font-mono text-xs">
                <div className="text-slate-600"><span className="text-indigo-650 font-semibold">Registered Phone:</span> 9876543210</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
