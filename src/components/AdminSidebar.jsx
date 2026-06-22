import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getWhatsAppStatus } from '../lib/whatsappAPI.js';
import { 
  GraduationCap, LayoutDashboard, Users, CreditCard, 
  MessageSquare, Settings as SettingsIcon, LogOut, Link2, Link2Off,
  Menu, X 
} from 'lucide-react';

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [waStatus, setWaStatus] = useState('disconnected');
  const [isOpen, setIsOpen] = useState(false);

  // Check WhatsApp status on load and periodically
  useEffect(() => {
    const checkStatus = async () => {
      const data = await getWhatsAppStatus();
      setWaStatus(data.status);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 7000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Student Directory', path: '/admin/students', icon: Users },
    { name: 'Fee Ledger', path: '/admin/fees', icon: CreditCard },
    { name: 'WhatsApp Panel', path: '/admin/whatsapp', icon: MessageSquare, badge: true },
    { name: 'Settings', path: '/admin/settings', icon: SettingsIcon },
  ];

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out of the admin console?')) {
      await logout();
      navigate('/');
    }
  };

  return (
    <>
      {/* Mobile Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-40 md:hidden p-3.5 rounded-full bg-slate-900 text-white shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-slate-800"
        title={isOpen ? 'Close Menu' : 'Open Menu'}
      >
        {isOpen ? <X className="h-5.5 w-5.5" /> : <Menu className="h-5.5 w-5.5" />}
      </button>

      {/* Backdrop overlay for mobile drawer */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Component */}
      <aside className={`fixed inset-y-0 left-0 z-35 w-64 bg-slate-950 border-r border-slate-800/60 shrink-0 flex flex-col justify-between py-6 px-4 h-screen transition-transform duration-300 transform md:sticky md:top-0 md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } overflow-y-auto shadow-xl md:shadow-none dark-scrollbar`}>
        
        {/* Brand Header */}
        <div>
          <div className="flex items-center gap-3 px-3 mb-8">
            <GraduationCap className="h-8 w-8 text-rose-500 animate-pulse" />
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide leading-none">AL MADRASATHUL ISLAHIYYA</h2>
              <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Admin Console</span>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path));
              
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.path);
                    setIsOpen(false); // Auto-close drawer on selection
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
                    isActive 
                      ? 'bg-indigo-600/20 border-indigo-500/35 text-white font-bold shadow-lg shadow-indigo-950/20' 
                      : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span>{item.name}</span>
                  </div>

                  {/* WhatsApp connection dot indicator in sidebar */}
                  {item.badge && (
                    <span className={`h-2 w-2 rounded-full ring-2 ${
                      waStatus === 'ready' 
                        ? 'bg-emerald-500 ring-emerald-950/40 animate-pulse' 
                        : waStatus === 'connecting'
                        ? 'bg-amber-500 ring-amber-950/40'
                        : 'bg-rose-500 ring-rose-950/40'
                    }`} title={`WhatsApp status: ${waStatus}`} />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Log Out */}
        <div className="pt-6 border-t border-slate-800/60">
          
          {/* Connection status snippet */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/40 border border-slate-800/60 rounded-xl mb-4">
            {waStatus === 'ready' ? (
              <>
                <Link2 className="h-3.5 w-3.5 text-emerald-555 shrink-0" />
                <span className="text-[10px] text-emerald-450 font-bold font-mono">WA: CONNECTED</span>
              </>
            ) : (
              <>
                <Link2Off className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                <span className="text-[10px] text-rose-450 font-bold font-mono">WA: OFFLINE</span>
              </>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-950/25 hover:border-rose-900/30 border border-transparent transition-all cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5 text-slate-500 group-hover:text-rose-400" />
            <span>Exit Admin Session</span>
          </button>
        </div>

      </aside>
    </>
  );
}
