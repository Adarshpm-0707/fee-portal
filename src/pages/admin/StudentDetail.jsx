import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar.jsx';
import { getStudentById, updateStudent, getStudentsByContact, getNextAdmissionNumber, getFeesByStudent, AVAILABLE_CLASSES, formatClassName } from '../../lib/firestore.js';
import { sendReceipt } from '../../lib/whatsappAPI.js';
import { GraduationCap, ArrowLeft, Loader2, Save, MessageSquare, CreditCard, Calendar, CheckCircle, AlertCircle, IndianRupee } from 'lucide-react';
 
export default function StudentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
 
  // Form states
  const [fullName, setFullName] = useState('');
  const [parentName, setParentName] = useState('');
  const [contact, setContact] = useState('');
  const [studentClass, setStudentClass] = useState(AVAILABLE_CLASSES[0]);
  const [location, setLocation] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [feeCategory, setFeeCategory] = useState('Auto Fee');
  const [monthlyFee, setMonthlyFee] = useState(0);
  const [status, setStatus] = useState('pending_admission');
  const [studentIdCode, setStudentIdCode] = useState('');
  const [siblings, setSiblings] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const student = await getStudentById(id);
        if (student) {
          setFullName(student.fullName);
          setParentName(student.parentName);
          setContact(student.contact);
          setStudentClass(student.class);
          setLocation(student.location || '');
          setAdmissionNumber(student.admissionNumber || '');
          setFeeCategory(student.feeCategory || 'General');
          setMonthlyFee(student.monthlyFee || 0);
          setStatus(student.status);
          setStudentIdCode(student.studentId);

          // Fetch and sort fee records
          const records = await getFeesByStudent(student.studentId);
          const ACADEMIC_MONTHS = ["JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY"];
          const sorted = (records || []).sort((a, b) => ACADEMIC_MONTHS.indexOf(a.month) - ACADEMIC_MONTHS.indexOf(b.month));
          setFeeRecords(sorted);
        } else {
          setError('Student record not found.');
        }
      } catch (err) {
        console.error(err);
        setError('Error loading student records.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  useEffect(() => {
    const fetchSiblings = async () => {
      if (contact && studentIdCode) {
        try {
          const list = await getStudentsByContact(contact);
          setSiblings(list.filter(s => s.studentId !== studentIdCode));
        } catch (err) {
          console.error('Failed to fetch siblings:', err);
        }
      }
    };
    fetchSiblings();
  }, [contact, studentIdCode]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    // Clean phone number
    let cleanedContact = contact.toString().replace(/\D/g, '');
    if (cleanedContact.length === 10) {
      // Clean 10 digits
    } else if (cleanedContact.startsWith('91') && cleanedContact.length === 12) {
      cleanedContact = cleanedContact.substring(2);
    }

    try {
      const updatedData = {
        fullName: fullName.trim(),
        parentName: parentName.trim(),
        contact: cleanedContact,
        class: studentClass,
        location: location.trim(),
        admissionNumber: status === 'active' ? admissionNumber.trim() : '',
        feeCategory,
        monthlyFee: Number(monthlyFee),
        status
      };

      if (status === 'active' && !admissionNumber.trim()) {
        throw new Error('Admission Number is required for active accounts.');
      }

      await updateStudent(id, updatedData);
      setSuccess('Student record updated successfully.');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update record. Check configurations.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendWhatsApp = async () => {
    setSendingAlert(true);
    try {
      const response = await sendReceipt({
        phone: contact,
        parentName,
        studentName: fullName,
        admissionNumber: admissionNumber || 'Pending',
        month: 'Current Session',
        amount: monthlyFee || 0,
        type: 'reminder',
        studentClass,
        schoolName: 'St. Augustine High School'
      });
      alert(response.message || 'WhatsApp message successfully dispatched.');
    } catch (e) {
      alert(e.message || 'Failed to send WhatsApp message.');
    } finally {
      setSendingAlert(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    if (newStatus === 'active' && !admissionNumber) {
      try {
        const nextAdmNo = await getNextAdmissionNumber();
        setAdmissionNumber(nextAdmNo);
      } catch (e) {
        const randomSuffix = String(Math.floor(100 + Math.random() * 900));
        setAdmissionNumber(`ADM-2025-${randomSuffix}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex">
        <AdminSidebar />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
            <span className="text-sm text-slate-500">Retrieving profile...</span>
          </div>
        </main>
      </div>
    );
  }

  const totalPaid = feeRecords
    .filter(r => r.status === 'paid')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  
  const totalPending = feeRecords
    .filter(r => r.status === 'unpaid' || r.status === 'partial')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar navigation */}
      <AdminSidebar />

      {/* Main Panel Content */}
      <main className="flex-grow p-8 overflow-y-auto max-w-4xl">
        
        {/* Back navigation and quick header panel */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <button 
            onClick={() => navigate('/admin/students')} 
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-semibold group cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Directory
          </button>

          {status === 'active' && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 w-full sm:w-auto mt-2 sm:mt-0">
              {/* WhatsApp Single Alert trigger */}
              <button
                onClick={handleSendWhatsApp}
                disabled={sendingAlert}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black border border-yellow-500 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 w-full sm:w-auto cursor-pointer shadow-sm"
              >
                {sendingAlert ? <Loader2 className="h-3.5 w-3.5 animate-spin text-black" /> : <MessageSquare className="h-3.5 w-3.5 text-black" />}
                <span>Send WhatsApp Alert</span>
              </button>

              {/* View Fee Sheet redirects */}
              <button
                onClick={() => navigate('/admin/fees')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-750 hover:text-slate-950 rounded-xl text-xs font-semibold transition-all active:scale-95 w-full sm:w-auto cursor-pointer shadow-sm"
              >
                <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                <span>View Fee Ledger</span>
              </button>
            </div>
          )}
        </div>

        {/* Header Title */}
        <header className="mb-8 pb-6 border-b border-slate-200 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{fullName}</h1>
            <p className="text-xs text-slate-500 font-mono mt-1">Student ID Code: {studentIdCode}</p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
            status === 'active' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
              : 'bg-amber-50 border border-amber-100 text-amber-700'
          }`}>
            {status === 'active' ? 'Active Profile' : 'Pending Admission'}
          </span>
        </header>

        {/* Feedback toasts */}
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl text-xs font-light">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-105 text-emerald-750 p-4 rounded-xl text-xs font-semibold shadow-sm">
            {success}
          </div>
        )}

        {/* Profile Form Card */}
        <form onSubmit={handleSave} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Registered Parent Profile</h3>
          
          {/* Profile fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Full Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-2">Student Full Name *</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-900 text-xs font-light transition-all"
              />
            </div>

            {/* Parent Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-2">Parent / Guardian Name *</label>
              <input 
                type="text" 
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-900 text-xs font-light transition-all"
              />
            </div>

            {/* Contact */}
            <div>
              <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-2">WhatsApp Contact Number *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-450 text-xs font-medium">+91</span>
                <input 
                  type="tel" 
                  pattern="[0-9]{10}"
                  maxLength="10"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-12 pr-4 py-2.5 text-slate-900 text-xs font-light transition-all"
                />
              </div>
            </div>

            {/* Class & Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-2">Class *</label>
                <select 
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-700 text-xs cursor-pointer font-semibold"
                >
                  {AVAILABLE_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>{formatClassName(cls)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-2">Location / City *</label>
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-900 text-xs font-light transition-all"
                />
              </div>
            </div>


          </div>

          <div className="h-px bg-slate-100"></div>

          {/* Section 2: Administrative Billing */}
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Administrative Configurations</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Status approval dropdown */}
            <div>
              <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-2">Portal Status</label>
              <select 
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                <option value="pending_admission">Pending approval (Awaiting code)</option>
                <option value="active">Active (Full features & billing active)</option>
              </select>
            </div>

            {/* Admission Number */}
            <div>
              <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-2">
                Admission Number {status === 'active' ? '*' : '(Disabled in pending)'}
              </label>
              <input 
                type="text" 
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                required={status === 'active'}
                disabled={status === 'pending_admission'}
                placeholder="ADM-2025-XXX"
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-900 text-xs font-mono transition-all disabled:opacity-40"
              />
            </div>

            {/* Fee Category */}
            <div>
              <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-2">Fee category</label>
              <select 
                value={feeCategory}
                onChange={(e) => setFeeCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                <option value="Auto Fee">Auto Fee</option>
              </select>
            </div>

            {/* Monthly fee */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider">Monthly Fee Rate (INR)</label>
                {monthlyFee > 0 && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-mono">
                    ₹{monthlyFee.toLocaleString('en-IN')}/month
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold select-none">₹</span>
                <input 
                  type="number" 
                  value={monthlyFee}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMonthlyFee(val === '' ? 0 : Math.max(0, Number(val)));
                  }}
                  onFocus={(e) => e.target.select()}
                  min="0"
                  step="50"
                  required
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-8 pr-4 py-2.5 text-slate-900 text-xs font-mono transition-all focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-light mt-1.5">
                Saving will auto-sync this rate to all <span className="font-semibold text-amber-600">unpaid</span> months in the fee ledger &amp; parent view.
              </p>
            </div>

          </div>

          {/* Fee Ledger Section */}
          <div className="h-px bg-slate-100"></div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Fee Ledger Details</h3>
              <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded-lg text-slate-500 uppercase tracking-widest font-mono">
                {feeRecords.length} Records
              </span>
            </div>

            {/* Warning Info box */}
            <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 flex gap-3 text-xs text-amber-800 leading-relaxed font-light">
              <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Note on Updates:</strong> Updating the <strong>Monthly Fee Rate (INR)</strong> above will automatically sync and update the billing amount for all <strong>Unpaid</strong> months listed below upon saving the student profile. Paid or partial records will not be affected.
              </span>
            </div>

            {/* Fee Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-50/20 border border-emerald-100/80 rounded-2xl p-4 flex flex-col shadow-sm">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Fees Paid</span>
                <span className="text-2xl font-black text-emerald-700 font-mono">₹{totalPaid}</span>
              </div>
              <div className="bg-amber-50/20 border border-amber-100/80 rounded-2xl p-4 flex flex-col shadow-sm">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Total Outstanding / Pending</span>
                <span className="text-2xl font-black text-amber-700 font-mono">₹{totalPending}</span>
              </div>
            </div>

            {/* Fee Records Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/65 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Billing Period</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Receipt / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {feeRecords.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-5 py-8 text-center text-slate-400 italic font-light">
                          No billing records generated. This account is pending approval.
                        </td>
                      </tr>
                    ) : (
                      feeRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <span className="font-bold text-slate-800">{rec.month}</span>
                            <span className="text-[10px] text-slate-400 font-mono ml-2">({rec.year})</span>
                          </td>
                          <td className="px-5 py-3 font-mono font-bold text-slate-700">
                            ₹{rec.amount}
                          </td>
                          <td className="px-5 py-3">
                            {rec.status === 'paid' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                                Paid
                              </span>
                            ) : rec.status === 'partial' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100">
                                Partial
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-100">
                                Unpaid
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-slate-550 font-light text-[11px]">
                            {rec.status === 'paid' ? (
                              <span className="font-mono">{rec.receiptId || '—'} {rec.paymentMode ? `(${rec.paymentMode})` : ''}</span>
                            ) : rec.status === 'partial' ? (
                              <span>Paid ₹{rec.amount} / Pending receipt</span>
                            ) : (
                              <span className="italic text-slate-400">Awaiting payment</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Siblings Section */}
          <div className="h-px bg-slate-100"></div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Siblings under this Parent</h3>
              <button
                type="button"
                onClick={() => navigate('/admin/students/new', { 
                  state: { prefill: { parentName, contact, location } } 
                })}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                + Add Sibling
              </button>
            </div>

            {siblings.length === 0 ? (
              <p className="text-xs text-slate-400 italic font-light">No other registered siblings found for this parent.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {siblings.map((sib) => (
                  <div key={sib.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center shadow-sm">
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">{sib.fullName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{formatClassName(sib.class)} | ID: {sib.studentId}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/students/${sib.id}`)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                    >
                      Edit Profile
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/admin/students')}
              className="w-full sm:flex-1 bg-slate-50 border border-slate-200 hover:border-slate-355 text-slate-655 font-semibold py-3 px-5 rounded-xl text-xs transition-all active:scale-95 flex justify-center items-center cursor-pointer"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold border border-yellow-500 py-3 px-5 rounded-xl text-xs transition-all active:scale-95 flex justify-center items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 text-black" />
                  <span>Update Student Profile</span>
                </>
              )}
            </button>
          </div>

        </form>

      </main>
    </div>
  );
}
