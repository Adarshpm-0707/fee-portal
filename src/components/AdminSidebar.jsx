import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getWhatsAppStatus } from '../lib/whatsappAPI.js';
import { 
  GraduationCap, LayoutDashboard, Users, CreditCard, 
  MessageSquare, Settings as SettingsIcon, LogOut, Link2, Link2Off 
} from 'lucide-react';

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [waStatus, setWaStatus] = useState('disconnected');

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
    <aside className="w-64 bg-white border-r border-slate-200 shrink-0 flex flex-col justify-between py-6 px-4 h-screen sticky top-0 overflow-y-auto shadow-sm z-20">
      
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-3 mb-8">
          <GraduationCap className="h-8 w-8 text-rose-600" />
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-wide leading-none">AUGUSTINE</h2>
            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Admin Console</span>
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
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
                  isActive 
                    ? 'bg-rose-50 border-rose-100 text-rose-750 font-bold' 
                    : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>

                {/* WhatsApp connection dot indicator in sidebar */}
                {item.badge && (
                  <span className={`h-2 w-2 rounded-full ring-2 ${
                    waStatus === 'ready' 
                      ? 'bg-emerald-500 ring-emerald-100 animate-pulse' 
                      : waStatus === 'connecting'
                      ? 'bg-amber-500 ring-amber-100'
                      : 'bg-rose-500 ring-rose-100'
                  }`} title={`WhatsApp status: ${waStatus}`} />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Log Out */}
      <div className="pt-6 border-t border-slate-100">
        
        {/* Connection status snippet */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-xl mb-4">
          {waStatus === 'ready' ? (
            <>
              <Link2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-[10px] text-emerald-600 font-bold font-mono">WA: CONNECTED</span>
            </>
          ) : (
            <>
              <Link2Off className="h-3.5 w-3.5 text-rose-550 shrink-0" />
              <span className="text-[10px] text-rose-550 font-bold font-mono">WA: OFFLINE</span>
            </>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 border border-transparent transition-all"
        >
          <LogOut className="h-4.5 w-4.5 text-slate-400 group-hover:text-rose-600" />
          <span>Exit Admin Session</span>
        </button>
      </div>

    </aside>
  );
}
