import React, { useEffect, useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar.jsx';
import { getStudents, getFeesByStudent, updateFeeRecord, addFeeRecord } from '../../lib/firestore.js';
import { generateReceipt, uploadReceiptToStorage } from '../../lib/generatePDF.js';
import { sendReceipt, sendToAll, sendToBulk } from '../../lib/whatsappAPI.js';
import { 
  Search, Filter, Send, FileText, CheckCircle2, 
  HelpCircle, Loader2, ArrowRight, X, Sparkles, Check, IndianRupee 
} from 'lucide-react';

const ACADEMIC_MONTHS = ["JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY"];

export default function FeeManagement() {
  const [students, setStudents] = useState([]);
  const [feeRecords, setFeeRecords] = useState({}); // studentId -> { month -> record }
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  
  // Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [broadcasting, setBroadcasting] = useState(false);

  // Modal State
  const [editingCell, setEditingCell] = useState(null); // { student, month, record }
  const [payAmount, setPayAmount] = useState(0);
  const [payMode, setPayMode] = useState('Online');
  const [updatingRecord, setUpdatingRecord] = useState(false);
  const [modalActionType, setModalActionType] = useState('pay'); // 'pay' | 'details'

  const loadFeeData = async () => {
    setLoading(true);
    try {
      const allStudents = await getStudents();
      const activeOnly = allStudents.filter(s => s.status === 'active');
      setStudents(activeOnly);

      // Fetch all fee records in PARALLEL — massively faster than sequential awaits
      const feeResults = await Promise.all(
        activeOnly.map(student => getFeesByStudent(student.studentId))
      );

      const recordsMap = {};
      activeOnly.forEach((student, idx) => {
        const monthMap = {};
        feeResults[idx].forEach(r => {
          monthMap[r.month] = r;
        });
        recordsMap[student.studentId] = monthMap;
      });

      setFeeRecords(recordsMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeeData();
  }, []);

  const filteredStudents = students.filter(s => {
    const matchesSearch = 
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.admissionNumber && s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesClass = classFilter === 'All' || s.class === classFilter;
    return matchesSearch && matchesClass;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudentIds(filteredStudents.map(s => s.studentId));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectOne = (studentId) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const handleCellClick = (student, month) => {
    const record = feeRecords[student.studentId]?.[month];
    if (!record) return;

    if (record.status === 'paid') {
      setModalActionType('details');
    } else {
      setModalActionType('pay');
      setPayAmount(record.amount || student.monthlyFee || 0);
      setPayMode('Online');
    }
    
    setEditingCell({ student, month, record });
  };

  const handleSavePayment = async () => {
    const { student, month, record } = editingCell;
    setUpdatingRecord(true);

    try {
      const originalAmount = student.monthlyFee || 0;
      let status = 'paid';
      if (payAmount < originalAmount) {
        status = 'partial';
      }

      const updatedRecord = {
        ...record,
        status,
        amount: Number(payAmount),
        paymentMode: payMode,
        paymentDate: new Date().toISOString(),
      };

      const savedRec = await updateFeeRecord(record.id, updatedRecord);
      
      setFeeRecords(prev => ({
        ...prev,
        [student.studentId]: {
          ...prev[student.studentId],
          [month]: savedRec
        }
      }));

      alert(`Payment of ₹${payAmount} registered for ${student.fullName} (${month}).`);
      setModalActionType('details');
      setEditingCell({ student, month, record: savedRec });

    } catch (e) {
      alert('Payment failed: ' + e.message);
    } finally {
      setUpdatingRecord(false);
    }
  };

  const handleGenerateReceipt = async () => {
    const { student, month, record } = editingCell;
    setUpdatingRecord(true);

    try {
      // Step 1: Generate PDF synchronously (pure CPU, instant — no await needed)
      const { base64String, receiptNo } = generateReceipt(student, record, 'Console Auditor');

      // Step 2: Upload to Firebase Storage (network call — this is the only true wait)
      const downloadUrl = await uploadReceiptToStorage(base64String, student.studentId, month);

      // Step 3: Save receipt metadata to Firestore (concurrent is fine here)
      const savedRec = await updateFeeRecord(record.id, {
        receiptId: receiptNo,
        receiptUrl: downloadUrl
      });

      // Update local UI state immediately
      setFeeRecords(prev => ({
        ...prev,
        [student.studentId]: {
          ...prev[student.studentId],
          [month]: savedRec
        }
      }));

      setEditingCell({ student, month, record: savedRec });
      alert(`Receipt generated successfully. ID: ${receiptNo}`);
    } catch (e) {
      alert('Error generating PDF receipt: ' + e.message);
    } finally {
      setUpdatingRecord(false);
    }
  };


  const handleSendWhatsAppReceipt = async () => {
    const { student, month, record } = editingCell;
    if (!record.receiptUrl) {
      alert('Please generate the PDF receipt first before sending.');
      return;
    }

    setUpdatingRecord(true);
    try {
      const response = await sendReceipt({
        phone: student.contact,
        parentName: student.parentName,
        studentName: student.fullName,
        admissionNumber: student.admissionNumber || 'Pending',
        month: `${month} ${record.year}`,
        amount: record.amount,
        receiptUrl: record.receiptUrl,
        feeRecordId: record.id,
        type: 'receipt',
        schoolName: 'St. Augustine High School'
      });

      await loadFeeData();
      setEditingCell(null);
      alert(response.message || 'WhatsApp notification sent successfully.');
    } catch (e) {
      alert(e.message || 'Failed to dispatch WhatsApp receipt.');
    } finally {
      setUpdatingRecord(false);
    }
  };

  const handleSendWhatsAppReminder = async () => {
    const { student, month, record } = editingCell;
    setUpdatingRecord(true);
    try {
      const response = await sendReceipt({
        phone: student.contact,
        parentName: student.parentName,
        studentName: student.fullName,
        admissionNumber: student.admissionNumber || 'Pending',
        month: `${month} ${record.year}`,
        amount: record.amount,
        type: 'reminder',
        studentClass: student.class,
        schoolName: 'St. Augustine High School'
      });
      setEditingCell(null);
      alert(response.message || 'WhatsApp reminder sent successfully.');
    } catch (e) {
      alert(e.message || 'Failed to dispatch WhatsApp reminder.');
    } finally {
      setUpdatingRecord(false);
    }
  };

  const handleSendSelectedReminders = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!confirm(`Broadcast pending fee alerts to the ${selectedStudentIds.length} checked students?`)) {
      return;
    }

    setBroadcasting(true);
    try {
      const res = await sendToBulk(selectedStudentIds, 'reminder');
      alert(`Bulk Complete! Sent: ${res.sent}, Failed: ${res.failed}`);
      setSelectedStudentIds([]);
    } catch (e) {
      alert('Broadcast failed: ' + e.message);
    } finally {
      setBroadcasting(false);
    }
  };

  const handleSendAllPending = async () => {
    if (!confirm('Broadcast pending fee reminders to all students in the database?')) {
      return;
    }

    setBroadcasting(true);
    try {
      const res = await sendToAll('reminder');
      alert(`Broadcast Complete! Sent: ${res.sent}, Failed: ${res.failed}`);
    } catch (e) {
      alert('Broadcast failed: ' + e.message);
    } finally {
      setBroadcasting(false);
    }
  };

  const calculateStudentSums = (studentId) => {
    const months = feeRecords[studentId] || {};
    let paid = 0;
    let pending = 0;
    
    ACADEMIC_MONTHS.forEach(m => {
      const r = months[m];
      if (r) {
        if (r.status === 'paid') {
          paid += Number(r.amount || 0);
        } else {
          pending += Number(r.amount || 0);
        }
      }
    });

    return { paid, pending };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar navigation */}
      <AdminSidebar />

      {/* Main Panel Content */}
      <main className="flex-1 p-8 overflow-y-auto max-w-7xl relative pb-28">
        
        {/* Header Ribbon */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Fee Ledger Sheet</h1>
            <p className="text-xs text-slate-500 font-light mt-1">Audit transactions, log cash entries and render receipt files.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 w-full lg:w-auto mt-4 lg:mt-0">
            <button
              onClick={handleSendAllPending}
              disabled={broadcasting}
              className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black border border-yellow-500 text-xs font-bold px-6 py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer w-full sm:w-auto"
            >
              {broadcasting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-black" /> : null}
              <span>Send All Pending</span>
            </button>
          </div>
        </header>

        {/* Filters Panel */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-450" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, Student ID, Admission No..."
              className="w-full bg-white border border-slate-200 focus:border-rose-500 rounded-xl pl-12 pr-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-light transition-all"
            />
          </div>

          <div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-705 text-xs font-semibold cursor-pointer"
            >
              <option value="All">All Classes Enrolled</option>
              {[...Array(12)].map((_, i) => (
                <option key={i+1} value={String(i+1)}>Class {i+1}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Ledger grid sheet table card */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm overflow-hidden">
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase select-none">
                  <th className="py-3 px-3 w-10">
                    <input 
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                      className="rounded border-slate-250 bg-slate-50 text-rose-600 focus:ring-rose-600 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 min-w-[150px]">Student Particulars</th>
                  <th className="py-3 px-3 text-center">Class</th>
                  {ACADEMIC_MONTHS.map(m => (
                    <th key={m} className="py-3 px-1.5 text-center w-[65px] font-mono">{m}</th>
                  ))}
                  <th className="py-3 px-3 text-right min-w-[80px]">Total Paid</th>
                  <th className="py-3 px-3 text-right min-w-[80px]">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-750">
                {loading ? (
                  <tr>
                    <td colSpan={18} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-rose-650" />
                        <span className="text-slate-450 text-xs font-light">Loading ledger matrix...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="py-12 text-center text-slate-400 font-light">
                      No active student profiles match search filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stu) => {
                    const isChecked = selectedStudentIds.includes(stu.studentId);
                    const { paid, pending } = calculateStudentSums(stu.studentId);

                    return (
                      <tr key={stu.id} className={`hover:bg-slate-50/50 transition-colors ${isChecked ? 'bg-rose-50/30' : ''}`}>
                        
                        {/* Checkbox */}
                        <td className="py-2.5 px-3">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleSelectOne(stu.studentId)}
                            className="rounded border-slate-250 bg-slate-50 text-rose-600 focus:ring-rose-600 h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>

                        {/* Name / Adm Code */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 text-sm truncate max-w-[140px]">{stu.fullName}</div>
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5">{stu.admissionNumber || stu.studentId}</div>
                        </td>

                        {/* Class */}
                        <td className="py-2.5 px-3 text-center text-slate-500">Cl. {stu.class}</td>

                        {/* Month block columns */}
                        {ACADEMIC_MONTHS.map(m => {
                          const r = feeRecords[stu.studentId]?.[m];
                          if (!r) {
                            return <td key={m} className="py-2.5 px-1 text-center font-mono text-slate-400 text-[10px]">—</td>;
                          }

                          const isPaid = r.status === 'paid';
                          const isPartial = r.status === 'partial';
                          const hasWA = r.whatsappSent;

                          return (
                            <td key={m} className="py-2 px-1 text-center">
                              <button
                                onClick={() => handleCellClick(stu, m)}
                                className={`w-full py-2 rounded-lg text-[9px] font-bold font-mono tracking-tighter border transition-all relative group flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                                  isPaid 
                                    ? 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100 text-emerald-700' 
                                    : isPartial 
                                    ? 'bg-amber-50 border-amber-100 hover:bg-amber-100 text-amber-700' 
                                    : 'bg-rose-55 border border-rose-100 hover:bg-rose-100 text-rose-700'
                                }`}
                                title={`${stu.fullName} — ${m}: ${r.status.toUpperCase()}`}
                              >
                                <span>₹{r.amount}</span>
                                {isPaid && hasWA && (
                                  <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
                                )}
                              </button>
                            </td>
                          );
                        })}

                        {/* Total Paid sum */}
                        <td className="py-2.5 px-3 text-right font-extrabold font-mono text-emerald-700">₹{paid}</td>

                        {/* Pending sum */}
                        <td className="py-2.5 px-3 text-right font-extrabold font-mono text-rose-700">₹{pending}</td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </section>

        {/* Floating broadcast panel */}
        {selectedStudentIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 px-4 py-3 sm:px-6 sm:py-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-3 sm:gap-6 z-40 animate-in slide-in-from-bottom duration-350 w-[calc(100%-2rem)] md:w-auto max-w-md">
            
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 bg-rose-500/20 text-rose-455 rounded-full flex items-center justify-center text-xs font-bold font-mono">
                {selectedStudentIds.length}
              </span>
              <span className="text-xs text-slate-200 font-semibold tracking-wide">Selected Students</span>
            </div>

            <div className="hidden sm:block h-6 w-px bg-slate-800"></div>

            <button
              onClick={handleSendSelectedReminders}
              disabled={broadcasting}
              className="bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {broadcasting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-black" /> : <Send className="h-3.5 w-3.5 text-black" />}
              <span>Send WhatsApp Reminders</span>
            </button>

          </div>
        )}

        {/* Modal: Cell Details & Action controls */}
        {editingCell && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <div className="bg-white border border-slate-200 max-w-md w-full rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
              
              {/* Close Button */}
              <button 
                onClick={() => setEditingCell(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-850 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <header className="mb-6">
                <span className="text-[10px] text-rose-600 tracking-wider uppercase font-extrabold font-mono">Month: {editingCell.month}</span>
                <h3 className="text-lg font-black text-slate-900 mt-1 leading-tight">{editingCell.student.fullName}</h3>
                <p className="text-[10px] text-slate-450 font-mono mt-0.5">ID: {editingCell.student.studentId} • Class {editingCell.student.class}</p>
              </header>

              {/* ACTION: PAY MODAL */}
              {modalActionType === 'pay' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                    <span className="text-slate-500 text-xs font-light">Default Monthly rate</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">₹{editingCell.student.monthlyFee || 0}</span>
                  </div>

                  {/* Payment Amount */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Amount Paid (INR)</label>
                    <input 
                      type="number" 
                      value={payAmount}
                      onChange={(e) => setPayAmount(Number(e.target.value))}
                      min="1"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-900 font-mono text-sm focus:outline-none"
                    />
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Mode</label>
                    <select
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      <option value="Online">Online Transfer</option>
                      <option value="Cash">Cash Deposit</option>
                      <option value="Cheque">Cheque Payment</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleSendWhatsAppReminder}
                      disabled={updatingRecord}
                      className="flex-1 bg-slate-50 border border-slate-200 hover:border-slate-350 text-indigo-650 text-xs font-semibold py-2.5 rounded-xl transition-all flex justify-center items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Reminder</span>
                    </button>

                    <button
                      onClick={handleSavePayment}
                      disabled={updatingRecord}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-all flex justify-center items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {updatingRecord ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      <span>Confirm Paid</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ACTION: PAID DETAILS & RECEIPT PANEL */}
              {modalActionType === 'details' && (
                <div className="space-y-5">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5 text-xs font-light">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Receipt Status</span>
                      <span className="text-emerald-700 font-bold">PAID</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Collected Amount</span>
                      <span className="text-slate-900 font-bold font-mono">₹{editingCell.record.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transaction Mode</span>
                      <span className="text-slate-900 font-semibold">{editingCell.record.paymentMode || 'Online'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Timestamp</span>
                      <span className="text-slate-550 font-mono text-[10px]">
                        {editingCell.record.paymentDate ? new Date(editingCell.record.paymentDate).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                      <span className="text-slate-500">PDF Invoice Link</span>
                      {editingCell.record.receiptId ? (
                        <span className="text-indigo-700 font-bold font-mono text-[10px] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded shadow-sm">
                          {editingCell.record.receiptId}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Not generated yet</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {/* Step 1: Generate PDF receipt */}
                    <button
                      onClick={handleGenerateReceipt}
                      disabled={updatingRecord}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-800 text-xs font-bold py-2.5 rounded-xl transition-all flex justify-center items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {updatingRecord ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-4 w-4 text-rose-600" />}
                      <span>{editingCell.record.receiptId ? 'Re-Generate & Upload PDF' : 'Generate & Upload PDF Receipt'}</span>
                    </button>

                    {/* Step 2: Send link via WhatsApp API */}
                    <button
                      onClick={handleSendWhatsAppReceipt}
                      disabled={updatingRecord || !editingCell.record.receiptUrl}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex justify-center items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {updatingRecord ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      <span>Send Receipt via WhatsApp</span>
                    </button>
                  </div>

                  {/* WhatsApp send log detail */}
                  {editingCell.record.whatsappSent && (
                    <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl flex items-start gap-2.5 text-[10px] text-emerald-700 leading-normal font-light">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold block uppercase tracking-wider text-[8px] mb-0.5">WhatsApp Log Status</span>
                        Dispatched successfully. Timestamp: {editingCell.record.whatsappSentAt ? new Date(editingCell.record.whatsappSentAt).toLocaleString() : new Date().toLocaleString()}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
