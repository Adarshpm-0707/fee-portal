import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar.jsx';
import { db, isFirebaseConfigured } from '../../lib/firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { GraduationCap, Save, Loader2, Sparkles, Sliders, Shield } from 'lucide-react';

export default function Settings() {
  const [schoolName, setSchoolName] = useState('St. Augustine High School');
  const [defaultFee, setDefaultFee] = useState(2000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    try {
      if (isFirebaseConfigured) {
        const docRef = doc(db, 'settings', 'school_config');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setSchoolName(data.schoolName || 'St. Augustine High School');
          setDefaultFee(data.defaultFee || 2000);
        }
      } else {
        const local = localStorage.getItem('school_settings');
        if (local) {
          const data = JSON.parse(local);
          setSchoolName(data.schoolName);
          setDefaultFee(data.defaultFee);
        }
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const data = {
        schoolName: schoolName.trim(),
        defaultFee: Number(defaultFee),
        updatedAt: new Date().toISOString()
      };

      if (isFirebaseConfigured) {
        const docRef = doc(db, 'settings', 'school_config');
        await setDoc(docRef, data, { merge: true });
      } else {
        localStorage.setItem('school_settings', JSON.stringify(data));
      }

      setSuccess('Configurations saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to update configurations.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex">
        <AdminSidebar />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
            <span className="text-sm text-slate-500 font-light">Loading configurations...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar navigation */}
      <AdminSidebar />

      {/* Main Panel Content */}
      <main className="flex-1 p-8 overflow-y-auto max-w-4xl">
        
        {/* Header Ribbon */}
        <header className="mb-8 pb-6 border-b border-slate-200">
          <h1 className="text-2xl font-black text-slate-900 font-sans tracking-wide">System Settings</h1>
          <p className="text-xs text-slate-500 font-light mt-1">Configure metadata variables, billing defaults and rules.</p>
        </header>

        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-xl text-xs font-semibold shadow-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl text-xs font-light">
            {error}
          </div>
        )}

        {/* Settings form container */}
        <form onSubmit={handleSave} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="h-5 w-5 text-rose-650" />
            <h3 className="text-sm font-bold text-slate-505 uppercase tracking-wider">School Identity & Pricing</h3>
          </div>

          <div className="grid grid-cols-1 gap-6">
            
            {/* School Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">School Display Name</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-900 text-xs font-medium focus:outline-none transition-all"
              />
              <span className="text-[10px] text-slate-500 font-light mt-1.5 block leading-normal">
                * This name is dynamically injected into generated PDF receipts and WhatsApp message headers.
              </span>
            </div>

            {/* Default Fee */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Base Monthly Fee Rate (INR)</label>
              <input
                type="number"
                value={defaultFee}
                onChange={(e) => setDefaultFee(Number(e.target.value))}
                min="0"
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-900 text-xs font-mono font-bold focus:outline-none transition-all"
              />
              <span className="text-[10px] text-slate-500 font-light mt-1.5 block leading-normal">
                * Set default monthly billing rate applied to newly created students on admission.
              </span>
            </div>

          </div>

          <div className="h-px bg-slate-100 my-6"></div>

          {/* Submit Actions */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black border border-yellow-500 text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-md flex justify-center items-center gap-1.5 active:scale-95 cursor-pointer w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 text-black" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </form>

      </main>
    </div>
  );
}
