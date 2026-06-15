import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addStudent } from '../lib/firestore.js';
import { GraduationCap, ArrowLeft, Copy, Check, Info } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [parentName, setParentName] = useState('');
  const [contact, setContact] = useState('');
  const [location, setLocation] = useState('');
  const [children, setChildren] = useState([{ fullName: '', studentClass: '1' }]);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const addChild = () => {
    setChildren([...children, { fullName: '', studentClass: '1' }]);
  };

  const removeChild = (index) => {
    if (children.length === 1) return;
    setChildren(children.filter((_, i) => i !== index));
  };

  const updateChild = (index, field, value) => {
    const updated = [...children];
    updated[index][field] = value;
    setChildren(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!parentName || !contact || !location) {
      setError('Please fill in all parent details.');
      return;
    }

    const invalidChild = children.find(c => !c.fullName.trim());
    if (invalidChild) {
      setError('Please fill in full names for all children.');
      return;
    }

    setSubmitting(true);
    setError('');

    // Format phone number to clean digits
    let cleanedContact = contact.replace(/\D/g, '');
    if (cleanedContact.length === 10) {
      // Keep it as 10 digits
    } else if (cleanedContact.startsWith('91') && cleanedContact.length === 12) {
      cleanedContact = cleanedContact.substring(2);
    }

    try {
      const results = [];
      for (const child of children) {
        const studentData = {
          fullName: child.fullName.trim(),
          parentName: parentName.trim(),
          contact: cleanedContact,
          class: child.studentClass,
          location: location.trim(),
          admissionNumber: '',
          feeCategory: 'Auto Fee',
          monthlyFee: 2000,
          status: 'pending_admission'
        };
        const result = await addStudent(studentData);
        results.push(result);
      }
      setSuccessData(results);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to complete registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-15%] w-[55%] h-[55%] bg-rose-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-15%] w-[55%] h-[55%] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-md w-full z-10">
        
        {/* Back Button */}
        {!successData && (
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 text-sm group font-semibold"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Portal Selector
          </button>
        )}

        {/* Card Frame */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl">
          
          {!successData ? (
            <>
              {/* Logo / Heading */}
              <div className="flex flex-col items-center mb-8">
                <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 text-center">Student Registration</h2>
                <p className="text-slate-500 text-xs text-center mt-1 font-light">
                  Submit enrollment details to start your application process.
                </p>
              </div>

              {error && (
                <div className="mb-6 bg-rose-550/5 border border-rose-100 text-rose-600 p-3 rounded-xl text-sm font-light">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Parent Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Parent / Guardian Name</label>
                  <input 
                    type="text" 
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    required
                    placeholder="Enter parent's full name"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all font-light"
                  />
                </div>

                {/* Contact (WhatsApp) */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contact Number (WhatsApp)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">+91</span>
                    <input 
                      type="tel" 
                      pattern="[0-9]{10}"
                      maxLength="10"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      required
                      placeholder="98765 43210"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all font-light"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Location</label>
                  <input 
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                    placeholder="e.g. Mumbai"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all font-light"
                  />
                </div>


                {/* Dynamic Children List */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider">Children Information</label>
                    <button
                      type="button"
                      onClick={addChild}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                    >
                      + Add Child
                    </button>
                  </div>

                  {children.map((child, index) => (
                    <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative space-y-3">
                      {children.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeChild(index)}
                          className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 text-xs font-semibold"
                        >
                          Remove
                        </button>
                      )}
                      
                      {/* Child Name */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Child {index + 1} Full Name</label>
                        <input 
                          type="text" 
                          value={child.fullName}
                          onChange={(e) => updateChild(index, 'fullName', e.target.value)}
                          required
                          placeholder="Enter child's full name"
                          className="w-full bg-white border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all font-light text-sm"
                        />
                      </div>

                      {/* Class */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Class</label>
                        <select 
                          value={child.studentClass}
                          onChange={(e) => updateChild(index, 'studentClass', e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all font-medium text-xs cursor-pointer"
                        >
                          {[...Array(12)].map((_, i) => (
                            <option key={i+1} value={String(i+1)}>Class {i+1}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-rose-600/10 flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Submitting Applications...' : `Register ${children.length > 1 ? 'Children' : 'Student'}`}
                </button>
              </form>
            </>
          ) : (
            /* Success Display */
            <div className="flex flex-col items-center">
              
              {/* Checkmark icon */}
              <div className="h-16 w-16 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                <Check className="h-8 w-8 animate-bounce" />
              </div>

              <h2 className="text-2xl font-black text-slate-900 text-center">Registration Success!</h2>
              <p className="text-slate-500 text-xs text-center mt-2 font-light">
                Your admission applications have been registered.
              </p>

              {/* Status Note */}
              <div className="mt-4 bg-amber-50 border border-amber-100 text-amber-800 px-4 py-3 rounded-xl flex gap-3 text-xs font-light max-w-sm text-left leading-relaxed">
                <Info className="h-5 w-5 shrink-0 text-amber-600" />
                <span>Admission status is currently <b>Pending Approval</b>. An administrator will assign admission numbers shortly.</span>
              </div>

              {/* Generated credentials block */}
              <div className="w-full mt-6 space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-2 text-center">Your Portal Login Credentials</span>
                
                {/* Mobile Number */}
                <div className="flex justify-between items-center py-2.5">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Registered Mobile Number</span>
                    <span className="text-slate-900 font-mono text-xs font-bold select-all">+91 {contact}</span>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(contact, 0)}
                    className="p-1.5 text-slate-450 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-all"
                    title="Copy Mobile Number"
                  >
                    {copiedId === 0 ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Registered Children list summary */}
              <div className="w-full mt-4 space-y-2 max-h-[160px] overflow-y-auto pr-1">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Registered Children ({successData.length})</span>
                {successData.map((child, index) => (
                  <div key={index} className="flex justify-between items-center p-2.5 bg-white border border-slate-200 rounded-xl text-xs">
                    <span className="font-bold text-slate-800">{child.fullName}</span>
                    <span className="text-slate-500 font-medium">Class {child.class}</span>
                  </div>
                ))}
              </div>

              {/* Warning reminder to screenshot */}
              <p className="text-rose-600 text-xs font-semibold text-center mt-6">
                ⚠️ IMPORTANT: Please screenshot or copy this page now! You will need these details to access the portal.
              </p>

              {/* Exit option */}
              <button
                onClick={() => navigate('/parent/login')}
                className="w-full mt-6 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                Go to Parent Login
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
