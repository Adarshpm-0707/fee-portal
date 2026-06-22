import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar.jsx';
import { getDashboardStats, updateAdmissionNumber, getNextAdmissionNumber, clearAllData, formatClassName } from '../../lib/firestore.js';
import { getWhatsAppStatus, sendToAll } from '../../lib/whatsappAPI.js';
import { 
  Users, UserCheck, UserMinus, UserPlus, IndianRupee, MessageSquare, 
  Settings, CheckCircle, ArrowRight, ShieldCheck, HelpCircle, Loader2, Trash2 
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [waStatus, setWaStatus] = useState('disconnected');
  
  // Modal for assigning admission number
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [admNumberInput, setAdmNumberInput] = useState('');
  const [savingAdm, setSavingAdm] = useState(false);
  const [admError, setAdmError] = useState('');

  // Bulk send state
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const loadData = async () => {
    try {
      const dashboardStats = await getDashboardStats();
      setStats(dashboardStats);
      
      const waData = await getWhatsAppStatus();
      setWaStatus(waData.status);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll WhatsApp status and stats occasionally
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenAssignModal = async (student) => {
    setSelectedStudent(student);
    setAdmError('');
    try {
      // Auto-populate with the next sequential admission number
      const nextAdmNo = await getNextAdmissionNumber();
      setAdmNumberInput(nextAdmNo);
    } catch (e) {
      console.error('Failed to get next admission number:', e);
      setAdmNumberInput('ADM-2025-001');
    }
  };

  const handleSaveAdmission = async () => {
    if (!admNumberInput.trim()) {
      setAdmError('Admission number is required.');
      return;
    }

    setSavingAdm(true);
    setAdmError('');

    try {
      await updateAdmissionNumber(selectedStudent.id, admNumberInput.trim());
      setSelectedStudent(null);
      await loadData(); // Reload stats and pending list
    } catch (e) {
      setAdmError('Failed to save. Check format ADM-2025-XXX');
      console.error(e);
    } finally {
      setSavingAdm(false);
    }
  };

  const handleNotifyAll = async () => {
    if (!confirm('Are you sure you want to broadcast a pending fee reminder to all unpaid students? This will process messages sequentially with safety rate limits.')) {
      return;
    }

    setBroadcasting(true);
    setBroadcastMessage('Preparing WhatsApp client broadcast list...');

    try {
      const res = await sendToAll('reminder');
      alert(`Broadcast Complete!\nTotal Active Checked: ${res.total}\nMessages Sent: ${res.sent}\nFailed: ${res.failed}`);
      await loadData();
    } catch (err) {
      alert('Broadcast Error: ' + err.message);
    } finally {
      setBroadcasting(false);
      setBroadcastMessage('');
    }
  };

  const [clearingData, setClearingData] = useState(false);

  const handleClearAllData = async () => {
    if (!confirm("CRITICAL WARNING: This will permanently delete ALL students, fee records, and WhatsApp notification logs from the database. This action CANNOT be undone. Are you sure you want to proceed?")) {
      return;
    }

    const verification = prompt("To confirm deletion, type 'DELETE ALL' in the box below:");
    if (verification !== "DELETE ALL") {
      alert("Verification failed. Data deletion cancelled.");
      return;
    }

    setClearingData(true);
    try {
      await clearAllData();
      alert("All system data has been successfully cleared.");
      await loadData();
    } catch (err) {
      alert("Failed to clear data: " + err.message);
    } finally {
      setClearingData(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
          <span className="text-sm text-slate-400">Loading Admin Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex dark-scrollbar">
      {/* Sidebar Component */}
      <AdminSidebar />

      {/* Main Panel Content */}
      <main className="flex-1 p-8 overflow-y-auto max-w-7xl">
        
        {/* Header Ribbon */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 pb-6 border-b border-slate-800/60">
          <div>
            <h1 className="text-2xl font-black text-white">Console Overview</h1>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto mt-4 lg:mt-0">
            {/* WhatsApp Connection Badge */}
            <div className={`flex items-center justify-center gap-2 px-3 py-2.5 border rounded-xl text-xs font-bold w-full sm:w-auto shrink-0 ${
              waStatus === 'ready'
                ? 'bg-emerald-950/40 border-emerald-900/30 text-emerald-400'
                : waStatus === 'connecting'
                ? 'bg-amber-950/40 border-amber-900/30 text-amber-400'
                : 'bg-rose-950/40 border-rose-900/30 text-rose-405'
            }`}>
              <span className={`h-2 w-2 rounded-full ${waStatus === 'ready' ? 'bg-emerald-500' : waStatus === 'connecting' ? 'bg-amber-500' : 'bg-rose-500'}`} />
              <span className="uppercase font-mono">WA: {waStatus}</span>
            </div>

            {/* Add New Student Button */}
            <button
              onClick={() => navigate('/admin/students/new')}
              className="bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-semibold px-6 py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 w-full sm:w-auto cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Student</span>
            </button>

            {/* Quick Notify Button */}
            <button
              onClick={handleNotifyAll}
              disabled={broadcasting || waStatus !== 'ready'}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold px-6 py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 w-full sm:w-auto cursor-pointer"
            >
              {broadcasting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Sending Alerts...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Notify All Pending</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Broadcasting banner progress indicator */}
        {broadcasting && (
          <div className="mb-6 bg-rose-950/20 border border-rose-900/40 text-rose-400 p-4 rounded-xl flex items-center gap-3 animate-pulse text-xs font-semibold shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin shrink-0 text-rose-400" />
            <span>{broadcastMessage}</span>
          </div>
        )}

        {/* Dynamic Statistics Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Card 1: Total Enrolled */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-md backdrop-blur-md">
            <div className="h-12 w-12 bg-blue-950/40 border border-blue-900/30 rounded-xl flex items-center justify-center text-blue-400 shadow-sm">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Enrolled</span>
              <span className="text-2xl font-black text-white font-mono">{stats?.totalStudents || 0}</span>
            </div>
          </div>

          {/* Card 2: Active Students */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-md backdrop-blur-md">
            <div className="h-12 w-12 bg-emerald-950/40 border border-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-400 shadow-sm">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Active Accounts</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">{stats?.activeStudents || 0}</span>
            </div>
          </div>

          {/* Card 3: Collected Fee amount */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-md backdrop-blur-md">
            <div className="h-12 w-12 bg-indigo-950/40 border border-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-400 shadow-sm">
              <IndianRupee className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Collected Fees</span>
              <span className="text-2xl font-black text-indigo-400 font-mono">₹{stats?.totalCollected?.toLocaleString() || 0}</span>
            </div>
          </div>

          {/* Card 4: Unpaid Fee amount */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-md backdrop-blur-md">
            <div className="h-12 w-12 bg-amber-950/40 border border-amber-900/30 rounded-xl flex items-center justify-center text-amber-400 shadow-sm">
              <IndianRupee className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Outstanding Fees</span>
              <span className="text-2xl font-black text-amber-400 font-mono">₹{stats?.totalPending?.toLocaleString() || 0}</span>
            </div>
          </div>

        </section>

        {/* Dashboard Split Views */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Pending Admission table block */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-md backdrop-blur-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Awaiting Admission Code Assignment</h3>
              <span className="bg-amber-950/40 text-amber-400 px-2 py-0.5 border border-amber-900/40 rounded text-[10px] font-bold shadow-sm">
                {stats?.pendingStudents || 0} Pending
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-400 text-[10px] uppercase font-bold">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Parent Details</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-light text-xs text-slate-300">
                  {stats?.pendingStudentsList && stats.pendingStudentsList.length > 0 ? (
                    stats.pendingStudentsList.map((stu) => (
                      <tr key={stu.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{stu.fullName}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {stu.studentId}</div>
                        </td>
                        <td className="py-3 px-3">{stu.parentName}</td>
                        <td className="py-3 px-3 text-slate-400 font-mono">+91 {stu.contact}</td>
                        <td className="py-3 px-3">{formatClassName(stu.class)}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleOpenAssignModal(stu)}
                            className="bg-rose-950/40 border border-rose-900/40 hover:bg-rose-600 hover:text-white text-rose-400 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm"
                          >
                            Assign Code
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500 text-xs font-light">
                        Clear! No pending self-registrations.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Notification Logs Log list */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-md backdrop-blur-md">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Recent WhatsApp Logs</h3>
            
            <div className="space-y-4">
              {stats?.recentLogs && stats.recentLogs.length > 0 ? (
                stats.recentLogs.map((log) => (
                  <div key={log.id} className="bg-slate-950/40 border border-slate-900 p-3 rounded-xl flex items-start justify-between gap-3 text-xs leading-normal">
                    <div>
                      <div className="font-bold text-slate-200">{log.studentName}</div>
                      <div className="text-[10px] text-slate-450 font-light mt-0.5">
                        Type: <span className="text-indigo-400 font-semibold">{log.type}</span> • {log.time}
                      </div>
                    </div>
                    
                    <span className={`px-2 py-0.5 border rounded-full text-[9px] font-extrabold font-mono uppercase ${
                      log.status === 'Sent'
                        ? 'bg-emerald-950/40 border-emerald-900/30 text-emerald-400'
                        : 'bg-rose-950/40 border-rose-900/30 text-rose-400'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-550 text-xs font-light">
                  No notifications recorded.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone Section */}
        <section className="mt-8 bg-red-950/10 border border-red-900/30 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trash2 className="h-4 w-4" />
                Danger Zone
              </h3>
              <p className="text-xs text-slate-400 font-light mt-1">
                Permanently delete all students, billing history, receipts, and WhatsApp message logs from the database.
              </p>
            </div>
            <button
              onClick={handleClearAllData}
              disabled={clearingData}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white border border-rose-500 text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer w-full md:w-auto"
            >
              {clearingData ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
                  <span>Clearing All Data...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4.5 w-4.5" />
                  <span>Clear All System Data</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Modal: Assign Admission Number */}
        {selectedStudent && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-6 z-50">
            <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              
              <h3 className="text-lg font-bold text-white mb-2">Assign Admission Code</h3>
              <p className="text-xs text-slate-400 mb-6 font-light leading-relaxed">
                Provide an official school code for <b>{selectedStudent.fullName}</b>. This will activate their parents portal billing table.
              </p>

              {admError && (
                <div className="mb-4 bg-rose-950/30 border border-rose-900/40 text-rose-400 p-2.5 rounded-lg text-xs font-light">
                  {admError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Admission Code (ADM-2025-XXX)</label>
                  <input 
                    type="text" 
                    value={admNumberInput}
                    onChange={(e) => setAdmNumberInput(e.target.value)}
                    required
                    placeholder="ADM-2025-001"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-rose-500 text-sm dark-input"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="flex-1 bg-slate-850 border border-slate-850 hover:bg-slate-800 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAdmission}
                    disabled={savingAdm}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all flex justify-center items-center gap-1.5 cursor-pointer"
                  >
                    {savingAdm && <Loader2 className="h-3 w-3 animate-spin" />}
                    Save Approval
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
