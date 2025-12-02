
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Staff, QueueTicket } from '../types';
import { QrCode, Mic, CheckCircle, SkipForward, Users, Briefcase, ScanLine, Camera, X, Keyboard, RefreshCcw } from 'lucide-react';
import jsQR from 'jsqr';

interface QueueManagerProps {
  pendingStaff: Staff[];
  queue: QueueTicket[];
  onCheckIn: (staffId: string) => void;
  onUpdateTicketStatus: (ticketId: string, status: QueueTicket['status']) => void;
}

const QueueManager: React.FC<QueueManagerProps> = ({ pendingStaff, queue, onCheckIn, onUpdateTicketStatus }) => {
  const activeTabState = useState<'CHECK_IN' | 'CONTROL'>('CONTROL');
  const activeTab = activeTabState[0];
  const setActiveTab = activeTabState[1];
  
  const [scanInput, setScanInput] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  // Helper lists
  const waitingTickets = queue.filter(t => t.status === 'WAITING');
  const calledTickets = queue.filter(t => t.status === 'CALLED');
  const completedTickets = queue.filter(t => t.status === 'COMPLETED');

  // --- Scanning Logic ---

  const handleScanSuccess = useCallback((code: string) => {
    let targetId = code.trim();
    
    // Parse JSON if needed
    try {
      const parsed = JSON.parse(targetId);
      if (parsed && parsed.uid) {
        targetId = parsed.uid;
      }
    } catch (e) {
      // Not JSON, continue with raw string
    }

    const staff = pendingStaff.find(s => s.id === targetId || s.name === targetId || s.idCard === targetId);
    
    if (staff) {
      // Stop camera immediately on success to prevent double scans
      stopCamera();
      
      // Play a success sound (optional, browser policy dependent)
      try {
        const audio = new Audio('https://freetestdata.com/wp-content/uploads/2021/09/Free_Test_Data_100KB_MP3.mp3'); // Dummy URL, in real app use local asset
        // audio.play().catch(() => {}); 
      } catch (e) {}

      onCheckIn(staff.id);
      alert(`✅ 核销成功！\n\n${staff.name} 已完成签到。`);
    } else {
      // Only alert if we scanned something that looks like an ID but isn't found
      // To avoid spamming alerts on random QR codes, we could add a check
      // For now, we'll just stop camera to show the alert
      stopCamera();
      alert('❌ 核销失败：\n\n未找到该人员信息，请确认是否在“待面试”名单中。');
    }
  }, [pendingStaff, onCheckIn]);

  const tick = useCallback(() => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Use jsQR to decode
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          // Draw bounding box
          ctx.beginPath();
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#FF3B58";
          ctx.moveTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
          ctx.lineTo(code.location.topRightCorner.x, code.location.topRightCorner.y);
          ctx.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y);
          ctx.lineTo(code.location.bottomLeftCorner.x, code.location.bottomLeftCorner.y);
          ctx.lineTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
          ctx.stroke();

          handleScanSuccess(code.data);
          return; // Stop loop
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  }, [handleScanSuccess]);

  const startCamera = async () => {
    setIsCameraActive(true);
    setCameraError('');
    try {
      // Use environment (back) camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready is handled in tick
        videoRef.current.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
        videoRef.current.play();
        requestRef.current = requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError('无法访问摄像头。请确保授予权限或使用HTTPS访问。');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleManualCheckIn = () => {
    handleScanSuccess(scanInput);
    setScanInput('');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">面试现场管理</h1>
          <p className="text-gray-500 text-sm">签到、排队与叫号控制中心</p>
        </div>
        
        <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm w-full md:w-auto">
          <button
            onClick={() => setActiveTab('CONTROL')}
            className={`flex-1 md:flex-none justify-center px-4 py-3 md:py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'CONTROL' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Mic size={16} /> 叫号台
          </button>
          <button
            onClick={() => setActiveTab('CHECK_IN')}
            className={`flex-1 md:flex-none justify-center px-4 py-3 md:py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'CHECK_IN' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <QrCode size={16} /> 签到台
          </button>
        </div>
      </div>

      {activeTab === 'CHECK_IN' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
             {/* Camera Section - Mobile optimized aspect ratio */}
             <div className="bg-black rounded-xl overflow-hidden shadow-lg relative aspect-square md:aspect-video flex items-center justify-center">
                {!isCameraActive ? (
                   <div className="text-center p-6">
                      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                         <Camera size={32} className="text-gray-400" />
                      </div>
                      <p className="text-gray-400 mb-6">点击下方按钮开启摄像头扫码</p>
                      <button 
                        onClick={startCamera}
                        className="bg-indigo-600 text-white px-8 py-4 rounded-full font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/50 flex items-center gap-2 mx-auto active:scale-95 transform text-lg"
                      >
                         <ScanLine size={24} /> 开启扫码模式
                      </button>
                      {cameraError && <p className="text-red-400 text-xs mt-4">{cameraError}</p>}
                   </div>
                ) : (
                   <>
                      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                      
                      {/* Scanner Overlay UI */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                         <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1"></div>
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1"></div>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1"></div>
                            
                            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
                         </div>
                         <p className="mt-4 text-white/80 bg-black/50 px-3 py-1 rounded text-sm backdrop-blur-sm">将二维码放入框内</p>
                      </div>

                      <button 
                        onClick={stopCamera}
                        className="absolute top-4 right-4 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 backdrop-blur-sm z-10"
                      >
                        <X size={24} />
                      </button>
                   </>
                )}
             </div>

             {/* Manual Input Toggle */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <button 
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                   <span className="flex items-center gap-2 font-medium text-gray-700">
                      <Keyboard size={18} /> 手动输入核销
                   </span>
                   <span className="text-xs text-gray-400">{showManualInput ? '收起' : '展开'}</span>
                </button>
                
                {showManualInput && (
                   <div className="p-4 border-t border-gray-100 bg-gray-50 animate-fade-in">
                      <div className="flex gap-2">
                         <input 
                           type="text"
                           value={scanInput}
                           onChange={(e) => setScanInput(e.target.value)}
                           placeholder="输入姓名或ID"
                           className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                           onKeyDown={(e) => e.key === 'Enter' && handleManualCheckIn()}
                         />
                         <button 
                           onClick={handleManualCheckIn}
                           className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900"
                         >
                           确认
                         </button>
                      </div>
                   </div>
                )}
             </div>

             {/* Pending List */}
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                   <h4 className="font-bold text-gray-800 text-sm">今日待面试 ({pendingStaff.length})</h4>
                   <button className="text-indigo-600 text-xs flex items-center gap-1">
                      <RefreshCcw size={12} /> 刷新
                   </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {pendingStaff.length === 0 ? (
                    <p className="col-span-full text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                       暂无待签到人员
                    </p>
                  ) : pendingStaff.map(staff => (
                    <div key={staff.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 hover:bg-indigo-50 hover:border-indigo-100 transition-colors group">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                           {staff.name[0]}
                         </div>
                         <div className="overflow-hidden">
                           <p className="text-sm font-medium text-gray-800 truncate">{staff.name}</p>
                           <p className="text-xs text-gray-400 truncate">ID: {staff.idCard}</p>
                         </div>
                       </div>
                       <button 
                         onClick={() => onCheckIn(staff.id)}
                         className="text-xs bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white shadow-sm"
                       >
                         签到
                       </button>
                    </div>
                  ))}
                </div>
             </div>
          </div>
          
          {/* Stats Card (Mobile: Order First? No, keep logic simple) */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-xl h-fit">
             <div className="flex items-center gap-2 mb-2">
                <Briefcase size={20} className="text-indigo-200" />
                <h3 className="font-bold text-lg">排队数据中心</h3>
             </div>
             <p className="text-indigo-100 text-sm mb-6 opacity-90">
               实时监控现场流量与签到进度
             </p>
             
             <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/10">
                   <span className="text-xs text-indigo-200 uppercase tracking-wider">今日签到</span>
                   <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-bold">{queue.length}</span>
                      <span className="text-sm opacity-60">人</span>
                   </div>
                </div>

                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/10">
                   <span className="text-xs text-indigo-200 uppercase tracking-wider">剩余待签</span>
                   <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-bold">{pendingStaff.length}</span>
                      <span className="text-sm opacity-60">人</span>
                   </div>
                </div>
             </div>
             
             <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex justify-between text-sm mb-2">
                   <span className="opacity-80">总进度</span>
                   <span className="font-bold">{Math.round((queue.length / (pendingStaff.length + queue.length || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-black/20 rounded-full h-1.5">
                   <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((queue.length / (pendingStaff.length + queue.length || 1)) * 100, 100)}%` }}></div>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'CONTROL' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Waiting List */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
             <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                   <Users size={18} className="text-blue-500" /> 等待中 ({waitingTickets.length})
                </h3>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {waitingTickets.length === 0 && (
                   <div className="text-center py-10 text-gray-400">当前队列为空</div>
                )}
                {waitingTickets.map(ticket => (
                  <div key={ticket.id} className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 transition-colors shadow-sm relative group">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-2xl font-bold text-gray-800">{ticket.ticketNumber}</span>
                        <span className="text-xs text-gray-400">{new Date(ticket.checkInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} 签到</span>
                     </div>
                     <p className="text-sm text-gray-600 font-medium mb-3">{ticket.staffName}</p>
                     
                     <div className="flex gap-2">
                        <button 
                          onClick={() => onUpdateTicketStatus(ticket.id, 'CALLED')}
                          className="flex-1 bg-blue-600 text-white text-xs py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1 transition-colors"
                        >
                          <Mic size={14} /> 叫号
                        </button>
                     </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Active / Called */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
             <div className="p-4 border-b border-gray-100 bg-green-50 rounded-t-xl flex justify-between items-center">
                <h3 className="font-bold text-green-800 flex items-center gap-2">
                   <Briefcase size={18} /> 面试中 / 已叫号 ({calledTickets.length})
                </h3>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {calledTickets.map(ticket => (
                  <div key={ticket.id} className="p-4 rounded-xl border border-green-200 bg-green-50/50 shadow-sm">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-2xl font-bold text-green-700">{ticket.ticketNumber}</span>
                        <span className="px-2 py-0.5 bg-green-200 text-green-800 text-xs rounded-full animate-pulse">进行中</span>
                     </div>
                     <p className="text-sm text-gray-800 font-medium mb-3">{ticket.staffName}</p>
                     
                     <div className="flex gap-2">
                        <button 
                          onClick={() => onUpdateTicketStatus(ticket.id, 'COMPLETED')}
                          className="flex-1 bg-white border border-green-200 text-green-700 text-xs py-2 rounded-lg hover:bg-green-100 flex items-center justify-center gap-1 transition-colors"
                        >
                          <CheckCircle size={14} /> 完成
                        </button>
                        <button 
                           onClick={() => onUpdateTicketStatus(ticket.id, 'SKIPPED')}
                           className="px-3 bg-white border border-gray-200 text-gray-500 text-xs py-2 rounded-lg hover:bg-gray-100 transition-colors"
                           title="过号/未到"
                        >
                          <SkipForward size={14} />
                        </button>
                     </div>
                  </div>
                ))}
                {calledTickets.length === 0 && (
                   <div className="text-center py-10 text-gray-400">暂无正在进行的面试</div>
                )}
             </div>
          </div>

          {/* Completed History */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
             <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                <h3 className="font-bold text-gray-600 flex items-center gap-2">
                   <CheckCircle size={18} /> 已完成 ({completedTickets.length})
                </h3>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {completedTickets.map(ticket => (
                  <div key={ticket.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 flex justify-between items-center opacity-70">
                     <div>
                        <span className="font-bold text-gray-700 mr-2">{ticket.ticketNumber}</span>
                        <span className="text-sm text-gray-600">{ticket.staffName}</span>
                     </div>
                     <span className="text-xs text-gray-400">已结束</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueManager;
