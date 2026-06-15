import React from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, UserPlus, UserCheck } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center relative py-12 px-4 sm:px-6 overflow-y-auto">
      {/* Top right floating admin link */}
      <div className="absolute top-6 right-6 z-20"></div>
      
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl w-full text-center z-10 flex flex-col items-center my-auto">
        {/* Top Header Logo */}
        <div className="flex items-center gap-2 md:gap-3 mb-6 bg-white border border-slate-200/80 px-4 py-2 md:px-6 md:py-3 rounded-full shadow-sm max-w-full">
          <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-rose-600 shrink-0" />
          <span className="text-xs md:text-sm font-bold tracking-wider text-slate-800 uppercase">
            AL MADRASATHUL ISLAHIYYA
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-slate-900 leading-tight">
          Auto Fee{" "} <br/>
          <span className="bg-gradient-to-r from-rose-600 via-indigo-600 to-indigo-700 bg-clip-text text-transparent">
            <br className="hidden sm:inline" /> Management <br/> Portal
          </span>
        </h1>
        
        {/* Description */}
        <p className="text-sm md:text-base text-slate-600 max-w-2xl mb-8 md:mb-12 font-light leading-relaxed px-2">
      This portal helps manage student records, automate fee collection and receipt generation, send instant announcements and notifications, and maintain organized financial records.
        </p>

        {/* Navigation Grid (Private Admin layout hides /login card) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl px-2">
          {/* Card 1: Registration */}
          <div
            onClick={() => navigate("/register")}
            className="group cursor-pointer bg-white border border-slate-200/80 hover:border-blue-500/40 p-6 md:p-8 rounded-2xl flex flex-col items-center text-center transition-all duration-300 transform hover:-translate-y-1 shadow-sm hover:shadow-xl"
          >
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform mb-4 md:mb-6 border border-blue-500/20">
              <UserPlus className="h-6 w-6 md:h-7 md:w-7" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-slate-900 mb-2">
              Student Registration
            </h3>
          
          </div>

          {/* Card 2: Parent Portal */}
          <div
            onClick={() => navigate("/parent/login")}
            className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-500/40 p-6 md:p-8 rounded-2xl flex flex-col items-center text-center transition-all duration-300 transform hover:-translate-y-1 shadow-sm hover:shadow-xl"
          >
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform mb-4 md:mb-6 border border-indigo-500/20">
              <UserCheck className="h-6 w-6 md:h-7 md:w-7" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-slate-900 mb-2">
              Parent Portal
            </h3>
       
          </div>
        </div>
      </div>
    </div>
  );
}

