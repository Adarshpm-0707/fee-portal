import React, { useEffect, useState, useRef } from 'react';
import AdminSidebar from '../../components/AdminSidebar.jsx';
import { getWhatsAppStatus, getWhatsAppQR, sendToAll } from '../../lib/whatsappAPI.js';
import { getDashboardStats } from '../../lib/firestore.js';
import { 
  MessageSquare, QrCode, RefreshCw, CheckCircle2, 
  AlertTriangle, Loader2, Send, FileCheck, History 
} from 'lucide-react';

export default function WhatsAppPanel() {
  const [waStatus, setWaStatus] = useState('disconnected');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');
  const [retryCountdown, setRetryCountdown] = useState(0);

  // Broadcast action state
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastType, setBroadcastType] = useState('');
  const [broadcastProgress, setBroadcastProgress] = useState('');

  // Logs state
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Refs to hold interval timers
  const statusIntervalRef = useRef(null);
  const qrRetryIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // ---------------------------------------------------------------------------
  // QR Fetching — retries until a code is received or WA connects
  // ---------------------------------------------------------------------------
  const fetchQR = async () => {
    setQrLoading(true);
    setQrError('');
    try {
      const data = await getWhatsAppQR();
      if (data.success && data.qrDataUrl) {
        setQrCodeUrl(data.qrDataUrl);
        setQrError('');
        // Stop retry loop once we have a QR
        stopQrRetry();
      } else {
        // QR not ready yet — keep retrying
        setQrCodeUrl('');
        startQrRetryCountdown();
      }
    } catch (err) {
      setQrError(err.message || 'Server initializing WhatsApp session...');
      setQrCodeUrl('');
      startQrRetryCountdown();
    } finally {
      setQrLoading(false);
    }
  };

  const startQrRetryCountdown = () => {
    // Don't stack multiple countdowns
    if (countdownIntervalRef.current) return;

    setRetryCountdown(3);
    countdownIntervalRef.current = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          fetchQR();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopQrRetry = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setRetryCountdown(0);
  };

  // ---------------------------------------------------------------------------
  // Status Polling
  // ---------------------------------------------------------------------------
  const checkStatus = async () => {
    try {
      const data = await getWhatsAppStatus();
      const newStatus = data.status;
      setWaStatus(newStatus);

      if (newStatus === 'ready') {
        // WhatsApp connected — clear QR and stop retrying
        setQrCodeUrl('');
        setQrError('');
        stopQrRetry();
      } else if (newStatus === 'disconnected') {
        // Only kick off QR fetch if we don't already have one and aren't already loading
        if (!qrCodeUrl && !qrLoading && !countdownIntervalRef.current) {
          fetchQR();
        }
      }
    } catch (e) {
      console.error('Status check error:', e);
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const stats = await getDashboardStats();
      if (stats.recentLogs) setLogs(stats.recentLogs);
    } catch (e) {
      console.error('Error loading logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    // Initial load
    checkStatus();
    fetchLogs();

    // Poll status every 5s
    statusIntervalRef.current = setInterval(checkStatus, 5000);
    const logsInterval = setInterval(fetchLogs, 10000);

    return () => {
      clearInterval(statusIntervalRef.current);
      clearInterval(logsInterval);
      stopQrRetry();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Manual refresh handler
  // ---------------------------------------------------------------------------
  const handleManualRefresh = () => {
    stopQrRetry();
    setQrCodeUrl('');
    setQrError('');
    checkStatus();
    fetchQR();
    fetchLogs();
  };

  const handleBroadcast = async (type) => {
    const confirmMsg = type === 'reminder'
      ? 'Broadcast outstanding fee reminders to all students with unpaid fees?'
      : 'Send public receipt links to all students who paid this month?';

    if (!confirm(confirmMsg)) return;

    setBroadcasting(true);
    setBroadcastType(type);
    setBroadcastProgress('Processing queue. Throttling sends with 1s delays...');

    try {
      const res = await sendToAll(type);
      alert(`Broadcast successful!\nTotal Checked: ${res.total}\nDispatched: ${res.sent}\nFailures: ${res.failed}`);
      await fetchLogs();
    } catch (err) {
      alert('Broadcast failed: ' + err.message);
    } finally {
      setBroadcasting(false);
      setBroadcastType('');
      setBroadcastProgress('');
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-y-auto max-w-6xl">

        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900">WhatsApp Integration</h1>
            <p className="text-xs text-slate-500 font-light mt-1">Authenticate WhatsApp link and configure bulk transmissions.</p>
          </div>

          <button
            onClick={handleManualRefresh}
            title="Force refresh status & QR"
            className="p-2.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-500 hover:text-slate-900 rounded-xl transition-all shadow-sm cursor-pointer w-full sm:w-auto flex justify-center items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="text-xs font-semibold">Refresh</span>
          </button>
        </header>

        {/* Central Setup Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

          {/* QR & Connection Status Box */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[360px]">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">WhatsApp Gateway Status</h3>

                {/* Live status badge */}
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider font-mono ${
                  waStatus === 'ready'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : waStatus === 'connecting'
                    ? 'bg-amber-50 border-amber-100 text-amber-700'
                    : 'bg-rose-50 border-rose-100 text-rose-600'
                }`}>
                  ● {waStatus}
                </span>
              </div>

              {loadingStatus && !qrCodeUrl ? (
                <div className="flex items-center gap-3 text-slate-500 py-6 text-xs font-light">
                  <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
                  <span>Verifying WhatsApp gateway connection...</span>
                </div>
              ) : waStatus === 'ready' ? (
                /* ── CONNECTED ── */
                <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in">
                  <div className="h-16 w-16 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 animate-pulse" />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">WhatsApp Connected</h2>
                  <p className="text-xs text-slate-500 max-w-sm mt-2 font-light leading-relaxed">
                    The local browser gateway is logged in. System is ready to broadcast payment notifications and PDF receipt slips instantly.
                  </p>
                </div>
              ) : (
                /* ── DISCONNECTED / QR SCAN ── */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">

                  {/* QR Box */}
                  <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 p-6 rounded-2xl min-h-[240px] relative">
                    {qrLoading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-7 w-7 animate-spin text-rose-600" />
                        <span className="text-[10px] text-slate-500 font-mono">Fetching QR code...</span>
                      </div>
                    ) : qrCodeUrl ? (
                      <div className="flex flex-col items-center gap-3">
                        <img
                          src={qrCodeUrl}
                          alt="WhatsApp Auth QR"
                          className="h-44 w-44 rounded-xl border border-slate-200 shadow-md"
                        />
                        <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Scan QR Code</span>
                        <button
                          onClick={handleManualRefresh}
                          className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="h-3 w-3" /> Refresh QR
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-center text-xs p-4">
                        <QrCode className="h-10 w-10 text-slate-400 animate-pulse" />
                        <span className="text-slate-500 font-light mt-1 leading-relaxed">
                          {qrError || 'Starting WhatsApp session...'}
                        </span>
                        {retryCountdown > 0 ? (
                          <span className="text-[10px] font-mono text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                            Retrying in {retryCountdown}s...
                          </span>
                        ) : (
                          <button
                            onClick={handleManualRefresh}
                            className="mt-2 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Retry Now
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Scan Instructions */}
                  <div className="space-y-4 text-xs font-light leading-relaxed">
                    <h4 className="text-slate-900 font-bold text-sm tracking-wide">Scan Instructions</h4>
                    <ol className="list-decimal list-inside text-slate-500 space-y-2">
                      <li>Open <b>WhatsApp</b> on your mobile device.</li>
                      <li>Tap the <b>Menu / Settings</b> icon.</li>
                      <li>Select <b>Linked Devices</b>.</li>
                      <li>Tap <b>Link a Device</b>.</li>
                      <li>Point your camera at the QR code.</li>
                    </ol>
                    <p className="text-amber-700 text-[10px] bg-amber-50 border border-amber-100 p-2.5 rounded-lg flex gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                      Keep your phone online after scanning for the initial handshake. QR codes expire every ~20 seconds — this panel auto-refreshes.
                    </p>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-400 font-mono">
                      <span className="font-bold text-slate-600 block mb-1">Troubleshooting</span>
                      If no QR appears after 30s, the backend WhatsApp process may still be booting (Puppeteer/Chrome takes ~20s on first run). Use the Refresh button above.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom meta bar */}
            <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-between text-[10px] text-slate-400 font-semibold font-mono">
              <span>Host Node Port: 3001</span>
              <span>Auth Strategy: LocalAuth</span>
            </div>
          </div>

          {/* Bulk Broadcasts Box */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Bulk Broadcasts</h3>

              <div className="space-y-4">
                <button
                  onClick={() => handleBroadcast('reminder')}
                  disabled={broadcasting || waStatus !== 'ready'}
                  className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-900 text-xs font-bold py-3 px-4 rounded-xl flex items-center gap-3 active:scale-95 disabled:opacity-50 transition-all text-left cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block font-bold">Notify All Pending Fees</span>
                    <span className="text-[10px] text-slate-500 font-light block mt-0.5">Send alerts to students with unpaid balances.</span>
                  </div>
                </button>

                <button
                  onClick={() => handleBroadcast('receipt')}
                  disabled={broadcasting || waStatus !== 'ready'}
                  className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-900 text-xs font-bold py-3 px-4 rounded-xl flex items-center gap-3 active:scale-95 disabled:opacity-50 transition-all text-left cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block font-bold">Broadcast Paid Receipts</span>
                    <span className="text-[10px] text-slate-500 font-light block mt-0.5">Send payment confirmation slips to paid accounts.</span>
                  </div>
                </button>
              </div>
            </div>

            {broadcasting && (
              <div className="mt-4 bg-rose-50 border border-rose-100 p-3 rounded-xl flex flex-col gap-2 text-rose-600 text-[10px] animate-pulse leading-normal shadow-sm">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Broadcast Active: {broadcastType}</span>
                </div>
                <span>{broadcastProgress}</span>
              </div>
            )}
          </div>

        </div>

        {/* Notification Logs Table */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">System Notification Logs</h3>
            </div>
            <button
              onClick={fetchLogs}
              className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              Sync logs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Admission No</th>
                  <th className="py-2.5 px-3">Phone Number</th>
                  <th className="py-2.5 px-3 text-center">Alert Type</th>
                  <th className="py-2.5 px-3 text-center">Result Status</th>
                  <th className="py-2.5 px-3 text-right">Time Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loadingLogs && logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      Querying database logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      No broadcast histories logged yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{log.studentName}</td>
                      <td className="py-3 px-3 font-mono">{log.admissionNumber || 'Pending'}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">+91 {log.phone}</td>
                      <td className="py-3 px-3 text-center font-bold text-indigo-600">{log.type}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 border rounded-full text-[9px] font-extrabold uppercase font-mono ${
                          log.status === 'Sent'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : 'bg-rose-50 border-rose-100 text-rose-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 text-[10px] font-mono">{log.time}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
