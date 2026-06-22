import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar.jsx';
import { addStudent, getNextAdmissionNumber, AVAILABLE_CLASSES, formatClassName } from '../../lib/firestore.js';
import { GraduationCap, ArrowLeft, Loader2, Save, Plus, Trash2 } from 'lucide-react';
 
export default function StudentNew() {
  const navigate = useNavigate();
  const locationState = useLocation();
  const prefill = locationState.state?.prefill || {};
 
  const [parentName, setParentName] = useState(prefill.parentName || '');
  const [contact, setContact] = useState(prefill.contact || '');
  const [location, setLocation] = useState(prefill.location || '');
 
  const [children, setChildren] = useState([{
    fullName: '',
    studentClass: AVAILABLE_CLASSES[0],
    status: 'pending_admission',
    admissionNumber: '',
    feeCategory: 'Auto Fee',
    monthlyFee: 2000
  }]);
 
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
 
  const addChild = () => {
    setChildren([...children, {
      fullName: '',
      studentClass: AVAILABLE_CLASSES[0],
      status: 'pending_admission',
      admissionNumber: '',
      feeCategory: 'Auto Fee',
      monthlyFee: 2000
    }]);
  };
 
  const removeChild = (index) => {
    if (children.length === 1) return;
    setChildren(children.filter((_, i) => i !== index));
  };
 
  const updateChild = async (index, field, value) => {
    const updated = [...children];
    updated[index][field] = value;
 
    if (field === 'status' && value === 'active' && !updated[index].admissionNumber) {
      try {
        const nextAdmNo = await getNextAdmissionNumber();
        updated[index].admissionNumber = nextAdmNo;
      } catch (e) {
        const randomSuffix = String(Math.floor(100 + Math.random() * 900));
        updated[index].admissionNumber = `ADM-2025-${randomSuffix}`;
      }
    }
 
    setChildren(updated);
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!parentName || !contact || !location) {
      setError('Please fill in all required parent details.');
      return;
    }
 
    const invalidChild = children.find(c => !c.fullName.trim());
    if (invalidChild) {
      setError('Please fill in student names for all children.');
      return;
    }
 
    const activeWithoutAdm = children.find(c => c.status === 'active' && !c.admissionNumber.trim());
    if (activeWithoutAdm) {
      setError(`Admission Number is required for all active student accounts.`);
      return;
    }
 
    setSaving(true);
    setError('');
 
    // Clean phone number
    let cleanedContact = contact.replace(/\D/g, '');
    if (cleanedContact.length === 10) {
      // Keep it 10 digits
    } else if (cleanedContact.startsWith('91') && cleanedContact.length === 12) {
      cleanedContact = cleanedContact.substring(2);
    }
 
    try {
      for (const child of children) {
        const studentData = {
          fullName: child.fullName.trim(),
          parentName: parentName.trim(),
          contact: cleanedContact,
          class: child.studentClass,
          location: location.trim(),
          admissionNumber: child.status === 'active' ? child.admissionNumber.trim() : '',
          feeCategory: child.feeCategory,
          monthlyFee: Number(child.monthlyFee),
          status: child.status
        };
        await addStudent(studentData);
      }
      navigate('/admin/students');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to enroll student. Please check your data.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'active' && !children[0].admissionNumber) {
      try {
        const nextAdmNo = await getNextAdmissionNumber();
        setChildren(prev => {
          const updated = [...prev];
          updated[0] = { ...updated[0], admissionNumber: nextAdmNo };
          return updated;
        });
      } catch (e) {
        const randomSuffix = String(Math.floor(100 + Math.random() * 900));
        setChildren(prev => {
          const updated = [...prev];
          updated[0] = { ...updated[0], admissionNumber: `ADM-2025-${randomSuffix}` };
          return updated;
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex dark-scrollbar">
      {/* Sidebar Component */}
      <AdminSidebar />

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto max-w-4xl">
        
        {/* Back navigation */}
        <button 
          onClick={() => navigate('/admin/students')} 
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm font-semibold group cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Directory
        </button>

        {/* Header Ribbon */}
        <header className="mb-8 pb-6 border-b border-slate-800/60">
          <h1 className="text-2xl font-black text-white">Enroll New Student</h1>
          <p className="text-xs text-slate-400 font-light mt-1">Add a new student profile manually to the database.</p>
        </header>

        {error && (
          <div className="mb-6 bg-rose-950/30 border border-rose-900/40 text-rose-400 p-4 rounded-xl text-xs font-light shadow-sm animate-pulse">
            {error}
          </div>
        )}

        {/* Form Grid Card */}
        <form onSubmit={handleSubmit} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-md backdrop-blur-md space-y-6">
          
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Parent Profile</h3>
            <button
              type="button"
              onClick={addChild}
              className="text-xs font-semibold text-rose-500 hover:text-rose-455 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Child Profile</span>
            </button>
          </div>
          
          {/* Section 1: Parent Profile */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/55 p-4 rounded-xl border border-slate-850">
            
            {/* Parent Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Parent / Guardian Name *</label>
              <input 
                type="text" 
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                required
                placeholder="e.g. Rajesh Sharma"
                className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-white text-xs font-light transition-all dark-input"
              />
            </div>

            {/* Contact (WhatsApp) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Contact Number *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-medium">+91</span>
                <input 
                  type="tel" 
                  pattern="[0-9]{10}"
                  maxLength="10"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                  placeholder="98765 43210"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-xl pl-12 pr-4 py-2.5 text-white text-xs font-light transition-all dark-input"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">City / Location *</label>
              <input 
                type="text" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="e.g. Mumbai"
                className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-white text-xs font-light transition-all dark-input"
              />
            </div>

          </div>

          <div className="h-px bg-slate-800"></div>

          {/* Section 2: Children Profiles */}
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Children Profiles</h3>

          <div className="space-y-6">
            {children.map((child, index) => (
              <div key={index} className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl relative space-y-6 shadow-md">
                
                {children.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChild(index)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-rose-455 transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Child
                  </button>
                )}

                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Child #{index + 1} Profile</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Student Full Name *</label>
                    <input 
                      type="text" 
                      value={child.fullName}
                      onChange={(e) => updateChild(index, 'fullName', e.target.value)}
                      required
                      placeholder="e.g. Aarav Sharma"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-white text-xs font-light transition-all dark-input"
                    />
                  </div>

                  {/* Class */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Class *</label>
                    <select 
                      value={child.studentClass}
                      onChange={(e) => updateChild(index, 'studentClass', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-300 text-xs font-semibold cursor-pointer dark-input"
                    >
                      {AVAILABLE_CLASSES.map((cls) => (
                        <option key={cls} value={cls}>{formatClassName(cls)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Admission Approval Status</label>
                    <select 
                      value={child.status}
                      onChange={(e) => updateChild(index, 'status', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-300 text-xs font-semibold cursor-pointer dark-input"
                    >
                      <option value="pending_admission">Pending approval (Awaiting admission code)</option>
                      <option value="active">Active (Full features & billing active)</option>
                    </select>
                  </div>

                  {/* Admission Number */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Admission Number {child.status === 'active' ? '*' : '(Disabled in pending)'}
                    </label>
                    <input 
                      type="text" 
                      value={child.admissionNumber}
                      onChange={(e) => updateChild(index, 'admissionNumber', e.target.value)}
                      required={child.status === 'active'}
                      disabled={child.status === 'pending_admission'}
                      placeholder="ADM-2025-001"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-white text-xs font-mono transition-all disabled:opacity-40 dark-input"
                    />
                  </div>

                  {/* Fee Category */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Fee category</label>
                    <select 
                      value={child.feeCategory}
                      onChange={(e) => updateChild(index, 'feeCategory', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-300 text-xs font-semibold cursor-pointer dark-input"
                    >
                      <option value="Auto Fee">Auto Fee</option>
                    </select>
                  </div>

                  {/* Monthly Fee */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Monthly Fee Rate (INR)</label>
                    <input 
                      type="number" 
                      value={child.monthlyFee}
                      onChange={(e) => updateChild(index, 'monthlyFee', Number(e.target.value))}
                      min="0"
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-white text-xs font-mono transition-all dark-input"
                    />
                  </div>

                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={() => navigate('/admin/students')}
              className="w-full sm:flex-1 bg-slate-850 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 font-semibold py-3 px-5 rounded-xl text-xs transition-all active:scale-95 flex justify-center items-center cursor-pointer"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold border border-yellow-550 py-3 px-5 rounded-xl text-xs transition-all active:scale-95 flex justify-center items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  <span>Enrolling Students...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 text-black" />
                  <span>Save Profile & Enroll</span>
                </>
              )}
            </button>
          </div>

        </form>
 
      </main>
    </div>
  );
}
