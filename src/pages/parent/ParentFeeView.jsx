import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getFeesByStudent, getStudentsByContact, ACADEMIC_MONTHS } from '../../lib/firestore.js';
import { downloadReceiptLocally } from '../../lib/generatePDF.js';
import { 
  GraduationCap, LogOut, Download, CheckCircle, 
  Clock, AlertCircle, IndianRupee, User, 
  Calendar, MapPin, Hash, ShieldCheck
} from 'lucide-react';

export default function ParentFeeView() {
  const { currentUser, logout } = useAuth();
  const [childrenList, setChildrenList] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [feeRecords, setFeeRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    const fetchChildren = async () => {
      if (currentUser?.contact) {
        try {
          const list = await getStudentsByContact(currentUser.contact);
          setChildrenList(list);
          const current = list.find(c => c.studentId === currentUser.studentId) || list[0] || currentUser;
          setSelectedChild(current);
        } catch (err) {
          console.error('Error fetching children list:', err);
          setSelectedChild(currentUser);
        }
      } else {
        setSelectedChild(currentUser);
      }
    };
    fetchChildren();
  }, [currentUser]);

  useEffect(() => {
    const fetchFees = async () => {
      if (selectedChild?.studentId) {
        setLoading(true);
        try {
          const records = await getFeesByStudent(selectedChild.studentId);
          setFeeRecords(records);
        } catch (err) {
          console.error('Error fetching student fee records:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchFees();
  }, [selectedChild]);

  // Build a month-keyed map for O(1) lookup
  const monthMap = {};
  feeRecords.forEach(r => { monthMap[r.month] = r; });

  // Year labels for each month in the academic calendar
  const MONTH_YEARS = {
    JUN: 2025, JUL: 2025, AUG: 2025, SEP: 2025, OCT: 2025, NOV: 2025,
    DEC: 2025, JAN: 2026, FEB: 2026, MAR: 2026, APR: 2026, MAY: 2026
  };

  // Always display all 12 months; fill missing ones with a placeholder object
  const orderedRecords = ACADEMIC_MONTHS.map(month => {
    if (monthMap[month]) return monthMap[month];
    return {
      id: `placeholder_${month}`,
      month,
      year: MONTH_YEARS[month],
      amount: selectedChild?.monthlyFee || 0,
      status: 'not_generated',
      isPlaceholder: true
    };
  });

  const totalPaid = orderedRecords
    .filter(r => r.status === 'paid')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  
  const totalPending = orderedRecords
    .filter(r => r.status === 'unpaid' || r.status === 'partial')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);


  const handleDownload = async (record) => {
    setDownloading(record.id);
    try {
      // generateReceipt + doc.save() are pure synchronous CPU ops — instant, no network
      downloadReceiptLocally(selectedChild, record, 'School Accounts Department');
    } catch (e) {
      alert('Failed to generate PDF.');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Syncing school records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-slate-900 tracking-tight text-lg hidden sm:block">FeePortal</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right mr-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">Parent Account</p>
                <p className="text-sm font-bold text-slate-900">{selectedChild?.parentName}</p>
              </div>
              <button 
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-colors border border-slate-200 text-sm font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Child Selection Tabs */}
        {childrenList.length > 1 && (
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {childrenList.map((child) => (
              <button
                key={child.studentId}
                onClick={() => setSelectedChild(child)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border whitespace-nowrap transition-all duration-200 ${
                  selectedChild?.studentId === child.studentId
                    ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/10 text-indigo-600 shadow-sm'
                    : 'bg-transparent border-slate-200 text-slate-500 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${selectedChild?.studentId === child.studentId ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                <span className="font-bold text-sm">{child.fullName}</span>
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded uppercase font-bold text-slate-500">
                  Class {child.class}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          
          {/* Main Info Card */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-indigo-600 p-6 text-white relative">
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-1">{selectedChild?.fullName}</h2>
                <div className="flex flex-wrap gap-4 text-indigo-100 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-4 w-4" />
                    ID: {selectedChild?.studentId}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    Class {selectedChild?.class}
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <GraduationCap size={120} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 p-6 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <User className="h-3 w-3" /> Guardian
                </label>
                <p className="font-bold text-slate-800">{selectedChild?.parentName}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location
                </label>
                <p className="font-bold text-slate-800">{selectedChild?.location || 'Not Set'}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Admission No.
                </label>
                {selectedChild?.admissionNumber ? (
                  <p className="font-mono font-bold text-indigo-600">{selectedChild.admissionNumber}</p>
                ) : (
                  <p className="text-amber-600 font-bold text-sm flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Pending Verification
                  </p>
                )}
              </div>
            
            </div>
          </div>

          {/* Quick Stats Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paid to Date</span>
              </div>
              <p className="text-3xl font-black text-slate-900 font-mono">₹{totalPaid}</p>
              <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${(totalPaid / (totalPaid + totalPending || 1)) * 100}%` }}
                />
              </div>
            </div>

           
          </div>
        </div>

        {/* Fee Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Payment History & Schedule</h3>
            <span className="text-xs font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-500 uppercase tracking-tighter">
              {orderedRecords.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-white">
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orderedRecords.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="h-10 w-10 text-slate-200" />
                        <p className="text-slate-400 text-sm">No billing records found for this student.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orderedRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{rec.month}</p>
                        <p className="text-xs text-slate-400 font-medium">{rec.year}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-700">
                          {rec.isPlaceholder ? '—' : `₹${rec.amount}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {rec.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Paid
                          </span>
                        ) : rec.status === 'partial' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Partial
                          </span>
                        ) : rec.status === 'not_generated' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-slate-400 text-xs font-bold border border-slate-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            Not Generated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {rec.status === 'paid' ? (
                          <button
                            onClick={() => handleDownload(rec)}
                            disabled={downloading === rec.id}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl transition-all duration-200 text-xs font-bold disabled:opacity-50"
                          >
                            {downloading === rec.id ? (
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            Receipt
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs italic">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

  
      </main>
    </div>
  );
}