
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
            dark: '#1e293b',
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* Header */}
      <div className="bg-white px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-20">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100">
               {staff.name[0]}
            </div>
            <div>
               <h1 className="font-bold text-gray-800 text-lg leading-none">{staff.name}</h1>
               <p className="text-gray-400 text-xs mt-1">欢迎登录</p>
            </div>
         </div>
         <button 
            onClick={onLogout} 
            className="text-gray-500 hover:text-red-500 p-2 rounded-full hover:bg-gray-100 transition-colors"
         >
            <LogOut size={20} />
         </button>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-md mx-auto w-full space-y-6">
         
         {/* 1. Main Status Card (Ticket or QR) */}
         {myTicket ? (
            // --- CHECKED IN VIEW ---
            <div className="bg-white rounded-3xl shadow-lg border border-indigo-50 overflow-hidden animate-in zoom-in duration-300">
               <div className="bg-green-500 p-8 text-center text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.2)_1px,transparent_0)] bg-[length:20px_20px] opacity-30"></div>
                  <div className="relative z-10 flex flex-col items-center">
                     <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <CheckCircle2 size={36} className="text-white" />
                     </div>
                     <h2 className="text-2xl font-bold tracking-tight">已完成签到</h2>
                     <p className="text-green-100 text-sm mt-1">请在现场等候安排</p>
                  </div>
               </div>

               <div className="p-8 text-center bg-white relative">
                  {/* Decorative Ticket Notches */}
                  <div className="absolute top-0 left-0 -mt-3 -ml-3 w-6 h-6 bg-gray-50 rounded-full"></div>
                  <div className="absolute top-0 right-0 -mt-3 -mr-3 w-6 h-6 bg-gray-50 rounded-full"></div>

                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">您的入场编号</p>
                  <div className="text-5xl font-black text-gray-800 font-mono tracking-tighter mb-2">
                     {myTicket.ticketNumber}
                  </div>
                  <p className="text-xs text-gray-400 mt-4">
                     签到时间: {new Date(myTicket.checkInTime).toLocaleTimeString()}
                  </p>
               </div>
            </div>
         ) : (
            // --- QR CODE VIEW ---
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h2 className="text-xl font-bold text-gray-800 mb-2">扫码签到</h2>
               <p className="text-gray-500 text-sm mb-6 max-w-[200px]">
                  请向现场工作人员出示此二维码以核销入场
               </p>
               
               {/* QR Container */}
               <div className="relative p-3 bg-white rounded-2xl border-2 border-indigo-50 shadow-inner mb-6 w-64 h-64 flex items-center justify-center group">
                  {qrCodeDataUrl ? (
                     <img src={qrCodeDataUrl} className="w-full h-full object-contain rounded-lg" alt="QR" />
                  ) : (
                     <div className="animate-pulse w-full h-full bg-gray-50 rounded-lg flex items-center justify-center text-gray-300 text-xs">生成中...</div>
                  )}
                  
                  {/* Scanning Animation */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-[scan_2.5s_ease-in-out_infinite] rounded-full pointer-events-none"></div>
               </div>

               <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
                  <RefreshCw size={12} className={tokenTimer < 10 ? "animate-spin text-indigo-500" : ""} /> 
                  <span className="font-mono">二维码 {tokenTimer}s 后自动刷新</span>
               </div>
            </div>
         )}

         {/* 2. Personal Info Verification Card */}
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 pb-3 border-b border-gray-50">
               <FileText size={16} className="text-indigo-500" /> 个人信息核对
            </h3>
            
            <div className="space-y-4">
               {/* Registration Number Row */}
               <div className="flex items-center gap-4 bg-orange-50 p-3 rounded-lg border border-orange-100">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                     <Hash size={16} />
                  </div>
                  <div className="flex-1">
                     <p className="text-xs text-orange-600/70 mb-0.5">表格编号</p>
                     <p className="text-lg font-bold text-orange-700 font-mono tracking-wide">
                        {staff.registrationNumber || '未分配'}
                     </p>
                  </div>
               </div>

               <div className="flex items-center gap-4 px-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                     <User size={16} />
                  </div>
                  <div className="flex-1">
                     <p className="text-xs text-gray-400 mb-0.5">姓名</p>
                     <p className="text-sm font-medium text-gray-900">{staff.name}</p>
                  </div>
               </div>

               <div className="flex items-center gap-4 px-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                     <Phone size={16} />
                  </div>
                  <div className="flex-1">
                     <p className="text-xs text-gray-400 mb-0.5">手机号码</p>
                     <p className="text-sm font-medium text-gray-900 font-mono tracking-wide">
                        {staff.phone || '未录入'}
                     </p>
                  </div>
               </div>

               <div className="flex items-center gap-4 px-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                     <CreditCard size={16} />
                  </div>
                  <div className="flex-1">
                     <p className="text-xs text-gray-400 mb-0.5">身份证号</p>
                     <p className="text-sm font-medium text-gray-900 font-mono tracking-wide">
                        {staff.idCard || '未录入'}
                     </p>
                  </div>
               </div>
            </div>

            <p className="text-[10px] text-gray-400 mt-6 text-center">
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
