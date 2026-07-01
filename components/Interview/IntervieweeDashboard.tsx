import React, { useState, useEffect } from 'react';
import { Staff, QueueTicket } from '../../types';
import { Clock, RefreshCw, LogOut, CheckCircle2, User, Phone, CreditCard, FileText, Hash } from 'lucide-react';
import QRCode from 'qrcode';

interface IntervieweeDashboardProps {
  staff: Staff;
  myTicket?: QueueTicket;
  ticketsAhead: number; // Kept in interface but not displayed
  onLogout: () => void;
}

const IntervieweeDashboard: React.FC<IntervieweeDashboardProps> = ({ staff, myTicket, onLogout }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [tokenTimer, setTokenTimer] = useState(60);

  // Generate Dynamic QR Code
  useEffect(() => {
    const generateQR = async () => {
      const token = JSON.stringify({
        uid: staff.id,
        ts: Date.now(),
        type: 'CHECK_IN_REQ'
      });

      try {
        const url = await QRCode.toDataURL(token, {
          width: 300,
          margin: 2,
          color: {
            dark: '#0c2f42',
            light: '#ffffff'
          }
        });
        setQrCodeDataUrl(url);
      } catch (err) {
        console.error(err);
      }
    };

    generateQR();
    const interval = setInterval(() => {
      setTokenTimer((prev) => {
        if (prev <= 1) {
          generateQR();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [staff.id]);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-[#E5EEF8] shadow-sm flex justify-between items-center sticky top-0 z-20">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1677FF] flex items-center justify-center font-extrabold border border-blue-100/50">
               {staff.name[0]}
            </div>
            <div>
               <h1 className="font-extrabold text-[#0c2f42] text-sm leading-none">{staff.name}</h1>
               <p className="text-slate-400 text-[10px] mt-1 font-semibold">欢迎登录</p>
            </div>
         </div>
         <button 
            onClick={onLogout} 
            className="text-slate-400 hover:text-rose-500 p-2 rounded-full hover:bg-slate-50 transition-colors"
         >
            <LogOut size={18} />
         </button>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-md mx-auto w-full space-y-6">
         
         {/* 1. Main Status Card (Ticket or QR) */}
         {myTicket ? (
            // --- CHECKED IN VIEW ---
            <div className="bg-white rounded-3xl shadow-lg border border-blue-100/40 overflow-hidden animate-in zoom-in duration-300">
               <div className="bg-emerald-500 p-8 text-center text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.2)_1px,transparent_0)] bg-[length:20px_20px] opacity-30"></div>
                  <div className="relative z-10 flex flex-col items-center">
                     <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <CheckCircle2 size={36} className="text-white" />
                     </div>
                     <h2 className="text-xl font-extrabold tracking-tight">已完成签到</h2>
                     <p className="text-emerald-100 text-xs mt-1 font-medium">请在现场等候安排</p>
                  </div>
               </div>

               <div className="p-8 text-center bg-white relative">
                  {/* Decorative Ticket Notches */}
                  <div className="absolute top-0 left-0 -mt-3 -ml-3 w-6 h-6 bg-slate-50 rounded-full"></div>
                  <div className="absolute top-0 right-0 -mt-3 -mr-3 w-6 h-6 bg-slate-50 rounded-full"></div>

                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">您的入场编号</p>
                  <div className="text-5xl font-black text-[#0c2f42] tracking-tighter mb-2">
                     {myTicket.ticketNumber}
                  </div>
                  <p className="text-xs text-slate-400 mt-4 font-semibold">
                     签到时间: {new Date(myTicket.checkInTime).toLocaleTimeString()}
                  </p>
               </div>
            </div>
         ) : (
            // --- QR CODE VIEW ---
            <div className="bg-white rounded-3xl shadow-md border border-[#E5EEF8]/80 p-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h2 className="text-lg font-extrabold text-[#0c2f42] mb-1.5">扫码签到</h2>
               <p className="text-slate-400 text-xs mb-6 max-w-[200px] font-semibold leading-relaxed">
                  请向现场工作人员出示此二维码以核销入场
               </p>
               
               {/* QR Container */}
               <div className="relative p-3 bg-white rounded-3xl border-2 border-blue-50/50 shadow-inner mb-6 w-64 h-64 flex items-center justify-center group">
                  {qrCodeDataUrl ? (
                     <img src={qrCodeDataUrl} className="w-full h-full object-contain rounded-2xl" alt="QR" />
                  ) : (
                     <div className="animate-pulse w-full h-full bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 text-xs">生成中...</div>
                  )}
                  
                  {/* Scanning Animation */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-sky-300/40 shadow-[0_0_15px_rgba(0,162,232,0.6)] animate-[scan_2.5s_ease-in-out_infinite] rounded-full pointer-events-none"></div>
               </div>

               <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3.5 py-2 rounded-full font-semibold">
                  <RefreshCw size={12} className={tokenTimer < 10 ? "animate-spin text-[#1677FF]" : ""} /> 
                  <span>二维码 {tokenTimer}s 后自动刷新</span>
               </div>
            </div>
         )}

         {/* 2. Personal Info Verification Card */}
         <div className="bg-white rounded-2xl shadow-sm border border-[#E5EEF8]/80 p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2 pb-3 border-b border-slate-50">
               <FileText size={16} className="text-[#1677FF]" /> 个人信息核对
            </h3>
            
            <div className="space-y-4">
               {/* Registration Number Row */}
               <div className="flex items-center gap-4 bg-amber-50/50 p-3 rounded-xl border border-amber-100/40">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                     <Hash size={16} />
                  </div>
                  <div className="flex-1">
                     <p className="text-[10px] text-amber-600/80 mb-0.5 font-bold uppercase tracking-wider">表格编号</p>
                     <p className="text-lg font-black text-amber-700 tracking-wide">
                        {staff.registrationNumber || '未分配'}
                     </p>
                  </div>
               </div>

               <div className="flex items-center gap-4 px-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                     <User size={16} />
                  </div>
                  <div className="flex-1">
                     <p className="text-[10px] text-slate-400 mb-0.5 font-bold uppercase tracking-wider">姓名</p>
                     <p className="text-sm font-bold text-slate-800">{staff.name}</p>
                  </div>
               </div>

               <div className="flex items-center gap-4 px-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                     <Phone size={16} />
                  </div>
                  <div className="flex-1">
                     <p className="text-[10px] text-slate-400 mb-0.5 font-bold uppercase tracking-wider">手机号码</p>
                     <p className="text-sm font-bold text-slate-800 tracking-wide">
                        {staff.phone || '未录入'}
                     </p>
                  </div>
               </div>

               <div className="flex items-center gap-4 px-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                     <CreditCard size={16} />
                  </div>
                  <div className="flex-1">
                     <p className="text-[10px] text-slate-400 mb-0.5 font-bold uppercase tracking-wider">身份证号</p>
                     <p className="text-sm font-bold text-slate-800 tracking-wide">
                        {staff.idCard || '未录入'}
                     </p>
                  </div>
               </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-6 text-center font-medium leading-relaxed">
               * 请仔细核对以上信息，如有错误请及时联系现场工作人员修正
            </p>
         </div>

      </div>

      <style>{`
         @keyframes scan {
            0% { top: 10px; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: calc(100% - 10px); opacity: 0; }
         }
      `}</style>
    </div>
  );
};

export default IntervieweeDashboard;
