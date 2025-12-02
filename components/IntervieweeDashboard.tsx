
import React, { useState, useEffect, useRef } from 'react';
import { Staff, QueueTicket } from '../types';
import { Clock, Users, QrCode, RefreshCw, Calendar, LogOut } from 'lucide-react';
import QRCode from 'qrcode';

interface IntervieweeDashboardProps {
  staff: Staff;
  myTicket?: QueueTicket;
  ticketsAhead: number;
  onLogout: () => void;
}

const IntervieweeDashboard: React.FC<IntervieweeDashboardProps> = ({ staff, myTicket, ticketsAhead, onLogout }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [tokenTimer, setTokenTimer] = useState(60);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate Dynamic QR Code
  useEffect(() => {
    const generateQR = async () => {
      // Simulate a secure dynamic token: UserID + Timestamp
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

  const estimatedWaitTime = ticketsAhead * 15; // Assume 15 mins per person

  return (
    <div className="min-h-[100dvh] bg-gray-100 p-4 md:p-8 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 md:mb-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <img src={staff.avatar} alt="avatar" className="w-10 h-10 rounded-full border border-gray-300" />
          <div>
            <h2 className="font-bold text-gray-800 text-sm md:text-base">{staff.name}</h2>
            <p className="text-[10px] md:text-xs text-gray-500">面试申请人</p>
          </div>
        </div>
        <button 
          onClick={onLogout} 
          className="flex items-center gap-2 text-gray-600 hover:text-red-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 transition-colors text-xs md:text-sm"
        >
          <LogOut size={16} /> 退出
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-6 pb-6">
        
        {/* State 1: Queued (Have a ticket) */}
        {myTicket ? (
          <div className="w-full bg-white rounded-3xl shadow-xl overflow-hidden animate-fade-in border border-blue-100">
             <div className="bg-blue-600 p-6 md:p-8 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <p className="text-blue-100 font-medium mb-1 relative z-10 text-sm">您的排队号码</p>
                <h1 className="text-6xl md:text-7xl font-bold tracking-wider relative z-10">{myTicket.ticketNumber}</h1>
                <div className="mt-4 inline-block px-4 py-1.5 bg-blue-700/50 rounded-full text-xs backdrop-blur-sm border border-blue-400/30">
                  {myTicket.status === 'CALLED' ? '请前往面试间' : '等待叫号中...'}
                </div>
             </div>
             
             <div className="p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
                      <Users className="mx-auto text-blue-500 mb-2" size={24} />
                      <p className="text-xs text-gray-400">前方等待</p>
                      <p className="text-2xl font-bold text-gray-800">{ticketsAhead} <span className="text-xs font-normal">人</span></p>
                   </div>
                   <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
                      <Clock className="mx-auto text-orange-500 mb-2" size={24} />
                      <p className="text-xs text-gray-400">预计等待</p>
                      <p className="text-2xl font-bold text-gray-800">{estimatedWaitTime} <span className="text-xs font-normal">分钟</span></p>
                   </div>
                </div>

                {myTicket.status === 'CALLED' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 animate-pulse">
                     <div className="bg-green-100 p-2 rounded-full text-green-600">
                        <RefreshCw size={20} className="animate-spin" />
                     </div>
                     <div>
                        <h3 className="font-bold text-green-800">轮到您了！</h3>
                        <p className="text-sm text-green-700">请立即前往前台或指定面试间。</p>
                     </div>
                  </div>
                )}

                <div className="text-center">
                   <p className="text-xs text-gray-400">请留意现场广播或屏幕提示</p>
                   <p className="text-[10px] text-gray-300 mt-1">Ticket ID: {myTicket.id.slice(0,8)}</p>
                </div>
             </div>
          </div>
        ) : (
          /* State 2: Pending Scan (QR Code) */
          <div className="w-full bg-white rounded-3xl shadow-xl overflow-hidden animate-fade-in border border-gray-100">
            <div className="p-8 flex flex-col items-center">
              <h1 className="text-xl font-bold text-gray-800 mb-2">面试签到</h1>
              <p className="text-sm text-gray-500 text-center mb-6">请向前台工作人员或面试官出示此码<br/>以完成签到并领取排队号</p>
              
              <div className="relative bg-white p-2 rounded-xl shadow-inner border border-gray-100 mb-6 w-full max-w-[280px] aspect-square flex items-center justify-center">
                 {qrCodeDataUrl ? (
                   <img src={qrCodeDataUrl} alt="Check-in QR" className="w-full h-full object-contain rounded-lg" />
                 ) : (
                   <div className="w-full h-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-400">生成中...</div>
                 )}
                 {/* Scan Line Animation */}
                 <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>

              <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
                <RefreshCw size={12} className={tokenTimer < 10 ? 'animate-spin' : ''} />
                <span>二维码每 60 秒自动刷新</span>
              </div>
              
              <div className="w-full max-w-[200px] bg-gray-100 rounded-full h-1 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(tokenTimer / 60) * 100}%` }}
                />
              </div>
            </div>
            <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
               <p className="text-xs text-gray-500">遇到问题？请联系前台人工处理</p>
            </div>
          </div>
        )}
        
        <style>{`
          @keyframes scan {
            0% { top: 4%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 96%; opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default IntervieweeDashboard;
