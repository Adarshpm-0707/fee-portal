import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar.jsx';
import { getStudents, deleteStudent, AVAILABLE_CLASSES, formatClassName } from '../../lib/firestore.js';
import { sendToBulk, sendReceipt } from '../../lib/whatsappAPI.js';
import { 
  Plus, Search, Filter, MessageSquare, Edit2, Trash2, 
  Trash, Eye, AlertCircle, Check, Loader2, RefreshCw 
} from 'lucide-react';

export default function StudentList() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');

  // Row Action State
  const [sendingIndividualId, setSendingIndividualId] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filter logic
  const filteredStudents = students.filter(s => {
    const matchesSearch = 
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.admissionNumber && s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.contact.includes(searchQuery);

    const matchesClass = classFilter === 'All' || s.class === classFilter;
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredStudents.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSendBulk = async () => {
    if (!confirm(`Send pending fee reminders to the ${selectedIds.length} selected students?`)) {
      return;
    }
    setSendingBulk(true);
    setBulkProgress(`Sending alerts sequentially...`);
    try {
      const res = await sendToBulk(selectedIds, 'reminder');
      alert(`Bulk Complete! Sent: ${res.sent}, Failed: ${res.failed}`);
      setSelectedIds([]);
    } catch (e) {
      alert('Failed sending bulk alerts: ' + e.message);
    } finally {
      setSendingBulk(false);
      setBulkProgress('');
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you absolutely sure you want to delete the ${selectedIds.length} selected student records? This will also wipe their fee history and cannot be undone.`)) {
      return;
    }
    setLoading(true);
    try {
      for (const id of selectedIds) {
        await deleteStudent(id);
      }
      setSelectedIds([]);
      await fetchStudents();
    } catch (e) {
      alert('Delete error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendIndividual = async (student) => {
    setSendingIndividualId(student.id);
    try {
      const response = await sendReceipt({
        phone: student.contact,
        parentName: student.parentName,
        studentName: student.fullName,
        admissionNumber: student.admissionNumber || 'Pending',
        month: 'Current Session',
        amount: student.monthlyFee || 0,
        type: 'reminder',
        studentClass: student.class,
        schoolName: 'St. Augustine High School'
      });
      alert(response.message || 'WhatsApp alert dispatched successfully.');
    } catch (e) {
      alert(e.message || 'Failed to send individual WhatsApp.');
    } finally {
      setSendingIndividualId(null);
    }
  };

  const handleDeleteOne = async (id) => {
    if (!confirm('Are you sure you want to delete this student and all associated fee records?')) {
      return;
    }
    setLoading(true);
    try {
      await deleteStudent(id);
      await fetchStudents();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex dark-scrollbar">
      {/* Sidebar navigation */}
      <AdminSidebar />

      {/* Main Panel Content */}
      <main className="flex-1 p-8 overflow-y-auto max-w-7xl relative pb-28">
        
        {/* Header Section */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 pb-6 border-b border-slate-800/60">
          <div>
            <h1 className="text-2xl font-black text-white">Student Directory</h1>
            <p className="text-xs text-slate-400 font-light mt-1">Manage enrollments, assign classes, and edit profiles</p>
          </div>

          <button
            onClick={() => navigate('/admin/students/new')}
            className="bg-yellow-400 hover:bg-yellow-500 text-black border border-yellow-550 text-xs font-semibold px-6 py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 w-full lg:w-auto cursor-pointer mt-4 lg:mt-0"
          >
            <Plus className="h-4 w-4 text-black font-extrabold" />
            <span>Enroll New Student</span>
          </button>
        </header>

        {/* Filters and Search Bar Row */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Student ID, Admission No or contact..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-xl pl-12 pr-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-light transition-all dark-input"
            />
          </div>

          {/* Class Filter */}
          <div className="relative font-bold">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-xl pl-11 pr-4 py-2.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-semibold cursor-pointer appearance-none dark-input"
            >
              <option value="All">All Classes</option>
              {AVAILABLE_CLASSES.map((cls) => (
                <option key={cls} value={cls}>{formatClassName(cls)}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-semibold cursor-pointer dark-input"
            >
              <option value="All">All Statuses</option>
              <option value="active">Active Accounts</option>
              <option value="pending_admission">Pending Admissions</option>
            </select>
          </div>

        </section>

        {/* Directory Table Grid Card */}
        <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-md backdrop-blur-md overflow-hidden">
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold">
                  <th className="py-3 px-4 w-12">
                    <input 
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                      className="rounded border-slate-800 bg-slate-950 text-rose-600 focus:ring-rose-650 h-4 w-4 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Admission Details</th>
                  <th className="py-3 px-4">Student Details</th>
                  <th className="py-3 px-4">Guardian & Contact</th>
                  <th className="py-3 px-4">Grade & Location</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-light text-xs text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
                        <span className="text-slate-500 text-xs">Querying registry database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500">
                      No records matched your search query or filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stu) => {
                    const isSelected = selectedIds.includes(stu.id);
                    const isActive = stu.status === 'active';

                    return (
                      <tr 
                        key={stu.id} 
                        className={`hover:bg-slate-800/30 transition-colors ${isSelected ? 'bg-indigo-950/20' : ''}`}
                      >
                        {/* Checkbox column */}
                        <td className="py-3.5 px-4">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(stu.id)}
                            className="rounded border-slate-800 bg-slate-950 text-rose-600 focus:ring-rose-650 h-4 w-4 cursor-pointer"
                          />
                        </td>

                        {/* Admission column */}
                        <td className="py-3.5 px-4">
                          {stu.admissionNumber ? (
                            <span className="font-mono text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/30 px-2 py-1 rounded-md">
                              {stu.admissionNumber}
                            </span>
                          ) : (
                            <span className="text-amber-400 font-bold bg-amber-950/40 border border-amber-900/30 px-2.5 py-1 rounded-md text-[10px] tracking-wide uppercase">
                              Pending No.
                            </span>
                          )}
                          <div className="text-[10px] text-slate-500 font-mono mt-1.5">ID: {stu.studentId}</div>
                        </td>

                        {/* Student Details */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{stu.fullName}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Joined: {new Date(stu.createdAt?.seconds ? stu.createdAt.seconds * 1000 : stu.createdAt).toLocaleDateString()}</div>
                        </td>

                        {/* Guardian details */}
                        <td className="py-3.5 px-4 font-normal">
                          <div className="text-slate-200 font-medium">{stu.parentName}</div>
                          <div className="text-slate-400 font-mono text-[10px] mt-0.5">+91 {stu.contact}</div>
                        </td>

                        {/* Grade details */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-300 font-bold">{formatClassName(stu.class)}</div>
                          <div className="text-slate-500 text-[10px] mt-0.5">{stu.location || 'N/A'}</div>
                        </td>

                        {/* Status badge */}
                        <td className="py-3.5 px-4 text-center">
                          {isActive ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 font-bold tracking-wide uppercase text-[9px]">
                              Active
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-950/40 border border-amber-900/30 text-amber-400 font-bold tracking-wide uppercase text-[9px]">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            
                            {/* View / Edit */}
                            <button
                              onClick={() => navigate(`/admin/students/${stu.id}`)}
                              className="p-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition-all cursor-pointer"
                              title="View & Edit Student"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* Send WhatsApp (unpaid check template) */}
                            {isActive && (
                              <button
                                onClick={() => handleSendIndividual(stu)}
                                disabled={sendingIndividualId === stu.id}
                                className="p-1.5 bg-indigo-950/40 border border-indigo-900/30 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                                title="Send WhatsApp alert"
                              >
                                {sendingIndividualId === stu.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MessageSquare className="h-4 w-4" />
                                )}
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteOne(stu.id)}
                              className="p-1.5 bg-rose-950/40 border border-rose-900/30 text-rose-455 hover:bg-rose-600 hover:text-white rounded-lg transition-all cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </section>

        {/* Floating Bulk Action Panel (Glides in when items are selected) */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 px-4 py-3 sm:px-6 sm:py-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-3 sm:gap-6 z-40 animate-in slide-in-from-bottom duration-300 w-[calc(100%-2rem)] md:w-auto max-w-lg">
            
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center text-xs font-bold font-mono">
                {selectedIds.length}
              </span>
              <span className="text-xs text-slate-200 font-semibold tracking-wide">Selected Students</span>
            </div>

            <div className="hidden sm:block h-6 w-px bg-slate-800"></div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center">
              
              {/* WhatsApp broadcast */}
              <button
                onClick={handleSendBulk}
                disabled={sendingBulk}
                className="flex-1 sm:flex-initial bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {sendingBulk ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
                    <span className="text-[10px]">Broadcasting...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-3.5 w-3.5 text-black" />
                    <span>Send WhatsApp</span>
                  </>
                )}
              </button>

              {/* Bulk Delete */}
              <button
                onClick={handleDeleteSelected}
                disabled={sendingBulk}
                className="bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/30 text-rose-400 text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer sm:flex-initial"
                title="Wipe Selected Records"
              >
                <Trash className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}
