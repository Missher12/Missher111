
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { QueueTicket, RegistrationRecord, Staff } from '../../types';
import { 
  ScanLine, 
  Camera, 
  X, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  UserX, 
  UserCheck, 
  Clock, 
  ListFilter,
  Trash2,
  Phone,
  User,
  Zap,
  SwitchCamera,
  History
} from 'lucide-react';
import jsQR from 'jsqr';

interface QueueManagerProps {
  pendingStaff: Staff[]; 
  queue: QueueTicket[];
  registrationList: RegistrationRecord[]; 
  onCheckIn: (staffId: string) => void;
  onUpdateTicketStatus: (ticketId: string, status: QueueTicket['status']) => void;
  onBulkCheckIn?: (staffIds: string[]) => void;
  onClearQueue?: () => void;
}

interface ScanResult {
  status: 'SUCCESS' | 'ERROR' | 'WARNING';
  title: string;
  message: string;
  record?: RegistrationRecord | null;
}

const QueueManager: React.FC<QueueManagerProps> = ({ 
  queue, 
  registrationList, 
  onCheckIn, 
  onClearQueue 
}) => {
  // UI State
  const [activeTab, setActiveTab] = useState<'PENDING' | 'CHECKED'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [lastScanned, setLastScanned] = useState<ScanResult | null>(null);
  
  // Camera Device Management
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const activeStreamRef = useRef<MediaStream | null>(null);

  // --- Data Logic ---
  const checkedInIds = useMemo(() => new Set(queue.map(t => t.staffId)), [queue]);

  const pendingList = useMemo(() => {
    return registrationList.filter(r => !checkedInIds.has(r.id));
  }, [registrationList, checkedInIds]);

  const displayPending = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return pendingList.filter(r => 
      r.name.toLowerCase().includes(term) || 
      (r.phone && r.phone.includes(term)) ||
      r.registrationNumber.includes(term)
    );
  }, [pendingList, searchTerm]);

  const displayChecked = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return [...queue].reverse().filter(t => 
      t.staffName.toLowerCase().includes(term) || 
      t.ticketNumber.toLowerCase().includes(term)
    );
  }, [queue, searchTerm]);

  // --- Audio Feedback ---
  const playSound = (type: 'success' | 'error') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) { console.error(e); }
  };

  // --- Scan Handler ---
  const handleScanCode = useCallback((code: string) => {
    let targetId = code.trim();
    try {
      const parsed = JSON.parse(targetId);
      if (parsed.uid) targetId = parsed.uid;
    } catch (e) {}

    const record = registrationList.find(r => r.id === targetId || r.phone === targetId);

    if (!record) {
      playSound('error');
      const res: ScanResult = { status: 'ERROR', title: '无效二维码', message: '系统未找到该人员信息', record: null };
      setScanResult(res);
      setLastScanned(res);
      setTimeout(() => setScanResult(null), 2000);
      return;
    }

    if (checkedInIds.has(record.id)) {
      playSound('error');
      const res: ScanResult = { 
        status: 'WARNING', 
        title: '重复签到', 
        message: `${record.name} 已于 ${new Date().toLocaleTimeString()} 完成签到`,
        record 
      };
      setScanResult(res);
      setLastScanned(res);
      setTimeout(() => setScanResult(null), 2000);
      return;
    }

    playSound('success');
    onCheckIn(record.id);
    const res: ScanResult = {
      status: 'SUCCESS',
      title: '签到成功',
      message: '欢迎参加',
      record
    };
    setScanResult(res);
    setLastScanned(res);
    setTimeout(() => setScanResult(null), 1500);

  }, [registrationList, checkedInIds, onCheckIn]);

  // --- Camera Logic ---
  const tick = useCallback(() => {
    if (scanResult) {
      // Pause scanning while showing result
      requestRef.current = requestAnimationFrame(tick);
      return;
    }
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
          
          if (code && code.data) {
             handleScanCode(code.data);
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  }, [handleScanCode, scanResult]);

  // Get available cameras
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !currentDeviceId) {
           // Default to back camera if available, else first
           const backCam = videoInputs.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
           setCurrentDeviceId(backCam ? backCam.deviceId : videoInputs[0].deviceId);
        }
      } catch(e) {
        console.error("Error listing devices", e);
      }
    };
    getDevices();
  }, []);

  // START CAMERA EFFECT (Fix for "Camera not showing preview")
  useEffect(() => {
    const initCamera = async () => {
      if (!isCameraActive) return;
      
      setCameraError('');
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      
      // Stop previous stream if any
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
      }

      try {
        const constraints = { 
          video: currentDeviceId ? { deviceId: { exact: currentDeviceId } } : { facingMode: "environment" } 
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStreamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          // Wait for video to be ready to play
          videoRef.current.onloadedmetadata = async () => {
             try {
                await videoRef.current?.play();
                requestRef.current = requestAnimationFrame(tick);
             } catch (e) {
                console.error("Play failed", e);
             }
          };
        }
      } catch (err) {
        console.error(err);
        setCameraError('无法访问摄像头，请检查权限。');
        setIsCameraActive(false);
      }
    };

    if (isCameraActive) {
       initCamera();
    } else {
       // Cleanup if inactive
       if (requestRef.current) cancelAnimationFrame(requestRef.current);
       if (activeStreamRef.current) {
         activeStreamRef.current.getTracks().forEach(track => track.stop());
         activeStreamRef.current = null;
       }
    }

    return () => {
      // Unmount cleanup
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isCameraActive, currentDeviceId, tick]);

  const switchCamera = () => {
    if (videoDevices.length < 2) return;
    const currentIndex = videoDevices.findIndex(d => d.deviceId === currentDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];
    setCurrentDeviceId(nextDevice.deviceId);
    // State change of currentDeviceId will trigger the effect above to restart camera
  };

  // --- Manual Action ---
  const handleManualCheckIn = (record: RegistrationRecord) => {
    if (checkedInIds.has(record.id)) return;
    handleScanCode(record.id); // Re-use logic for consistent feedback
  };

  const handleResetData = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm('确定清空所有签到记录吗？此操作无法撤销。')) {
        if (onClearQueue) onClearQueue();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      
      {/* LEFT COLUMN: Camera Scanner & Stats */}
      <div className="lg:w-96 flex flex-col gap-4 shrink-0">
         
         {/* 1. Camera Card */}
         <div className="bg-black rounded-[2rem] overflow-hidden shadow-2xl relative aspect-[3/4] flex flex-col items-center justify-center group ring-8 ring-gray-100">
            
            {/* Top Bar inside Camera */}
            <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
               <span className="text-white/80 text-xs font-mono flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  {isCameraActive ? 'LIVE FEED' : 'OFFLINE'}
               </span>
               {videoDevices.length > 1 && isCameraActive && (
                  <button onClick={switchCamera} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-md transition-colors">
                     <SwitchCamera size={16} />
                  </button>
               )}
            </div>

            {/* Video Feed */}
            {!isCameraActive ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center p-6 w-full bg-slate-900">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500 shadow-inner">
                     <Camera size={32} />
                  </div>
                  <p className="text-slate-400 text-sm mb-6">点击下方按钮启动摄像头</p>
                  <button 
                    onClick={() => setIsCameraActive(true)}
                    className="px-6 py-3 bg-[#00A2E8] text-white rounded-full font-bold hover:bg-[#008ec7] transition-all shadow-lg shadow-sky-900/20 flex items-center gap-2"
                  >
                     <Zap size={16} fill="currentColor" /> 启动扫描
                  </button>
                  {cameraError && <p className="text-red-400 text-xs mt-4 bg-red-900/20 px-3 py-1 rounded">{cameraError}</p>}
               </div>
            ) : (
               <div className="relative w-full h-full bg-black">
                  <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Viewfinder Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                     <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#00A2E8] rounded-tl-xl -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#00A2E8] rounded-tr-xl -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#00A2E8] rounded-bl-xl -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#00A2E8] rounded-br-xl -mb-1 -mr-1"></div>
                        {/* Scanning Laser */}
                        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-[#00A2E8] shadow-[0_0_15px_rgba(0,162,232,0.8)] animate-[scan_1.5s_ease-in-out_infinite]"></div>
                     </div>
                  </div>

                  {/* Feedback Overlay (Success/Error) - Inside Camera */}
                  {scanResult && (
                     <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in zoom-in duration-200">
                        <div className="bg-white w-full max-w-[260px] rounded-2xl p-5 text-center shadow-2xl">
                           <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
                              scanResult.status === 'SUCCESS' ? 'bg-green-100 text-green-600' :
                              scanResult.status === 'WARNING' ? 'bg-orange-100 text-orange-600' :
                              'bg-red-100 text-red-600'
                           }`}>
                              {scanResult.status === 'SUCCESS' ? <CheckCircle2 size={32} /> : 
                               scanResult.status === 'WARNING' ? <AlertTriangle size={32} /> : 
                               <UserX size={32} />}
                           </div>
                           <h2 className="text-lg font-bold text-gray-900 mb-1">{scanResult.title}</h2>
                           {scanResult.record && (
                              <div className="bg-gray-50 rounded-lg p-2 mb-2 border border-gray-100">
                                 <p className="font-bold text-gray-800 text-lg">{scanResult.record.name}</p>
                                 <p className="text-xs text-gray-500">{scanResult.record.registrationNumber}</p>
                              </div>
                           )}
                           <p className="text-xs text-gray-500">{scanResult.message}</p>
                        </div>
                     </div>
                  )}

                  <button 
                    onClick={() => setIsCameraActive(false)}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 hover:bg-red-600/80 text-white px-4 py-2 rounded-full backdrop-blur-md transition-all text-xs font-medium border border-white/10 flex items-center gap-2"
                  >
                    <X size={14} /> 停止
                  </button>
               </div>
            )}
         </div>

         {/* 2. Last Scanned Widget & Stats */}
         <div className="space-y-4">
            {lastScanned?.record ? (
               <div className="bg-white p-4 rounded-xl border border-sky-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#00A2E8]"></div>
                  <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center text-[#00A2E8] font-bold text-lg shrink-0">
                     {lastScanned.record.name[0]}
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-0.5">最近核销</p>
                     <h3 className="font-bold text-gray-900">{lastScanned.record.name}</h3>
                     <p className="text-xs text-gray-500 font-mono">{lastScanned.record.registrationNumber}</p>
                  </div>
                  <div className="ml-auto text-green-500">
                     <CheckCircle2 size={24} />
                  </div>
               </div>
            ) : (
               <div className="bg-gray-50 border border-dashed border-gray-200 p-4 rounded-xl text-center">
                  <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                     <History size={12} /> 暂无最近核销记录
                  </p>
               </div>
            )}

            <div className="grid grid-cols-2 gap-3">
               <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center">
                  <p className="text-xs text-gray-400 mb-1">已签到</p>
                  <p className="text-2xl font-black text-green-600">{queue.length}</p>
               </div>
               <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center">
                  <p className="text-xs text-gray-400 mb-1">待签到</p>
                  <p className="text-2xl font-black text-orange-500">{pendingList.length}</p>
               </div>
            </div>
         </div>
      </div>

      {/* RIGHT COLUMN: List Management */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-0">
         
         {/* Toolbar */}
         <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4 bg-white shrink-0">
            <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
               <button 
                 onClick={() => setActiveTab('PENDING')}
                 className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                   activeTab === 'PENDING' ? 'bg-white text-[#00A2E8] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                 }`}
               >
                 <UserX size={16} /> 待签到
               </button>
               <button 
                 onClick={() => setActiveTab('CHECKED')}
                 className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                   activeTab === 'CHECKED' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                 }`}
               >
                 <UserCheck size={16} /> 已签到
               </button>
            </div>

            <div className="relative flex-1 max-w-sm">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="搜索姓名、手机或编号..."
                 className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm outline-none focus:bg-white focus:border-sky-300 focus:ring-4 focus:ring-sky-100 transition-all"
               />
            </div>
         </div>

         {/* Content Area */}
         <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 custom-scrollbar">
            {activeTab === 'PENDING' ? (
              <>
                {displayPending.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                     <ListFilter size={48} className="mb-4 opacity-20" />
                     <p className="font-medium">列表为空</p>
                     <p className="text-sm">所有人都已签到或未找到匹配项</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                     {displayPending.map(record => (
                       <div key={record.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-sky-300 hover:shadow-md transition-all flex justify-between items-center group">
                          <div className="flex items-center gap-3 overflow-hidden">
                             <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-sm group-hover:bg-sky-50 group-hover:text-[#00A2E8] transition-colors shrink-0">
                                {record.name[0]}
                             </div>
                             <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                   <h3 className="font-bold text-gray-800 truncate">{record.name}</h3>
                                   <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">#{record.registrationNumber}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                   <span className="flex items-center gap-1"><Phone size={10} /> {record.phone || '-'}</span>
                                </div>
                             </div>
                          </div>
                          <button 
                            onClick={() => handleManualCheckIn(record)}
                            className="px-4 py-2 bg-sky-50 text-[#00A2E8] rounded-lg text-xs font-bold hover:bg-[#00A2E8] hover:text-white transition-all whitespace-nowrap"
                          >
                            签到
                          </button>
                       </div>
                     ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {displayChecked.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                     <Clock size={48} className="mb-4 opacity-20" />
                     <p className="font-medium">暂无签到记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                     {displayChecked.map(ticket => (
                       <div key={ticket.id} className="bg-white p-3 rounded-xl border border-green-100 shadow-sm flex justify-between items-center">
                          <div className="flex items-center gap-3">
                             <div className="bg-green-50 text-green-600 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                                <CheckCircle2 size={20} />
                             </div>
                             <div>
                                <h3 className="font-bold text-gray-800 text-sm">{ticket.staffName}</h3>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Clock size={10} /> {new Date(ticket.checkInTime).toLocaleTimeString()}
                                  <span className="text-gray-300">|</span>
                                  <span className="font-mono text-gray-400">#{ticket.ticketNumber}</span>
                                </p>
                             </div>
                          </div>
                       </div>
                     ))}
                     
                     {/* Reset Button - Ensure propagation is handled */}
                     {onClearQueue && queue.length > 0 && (
                        <div className="pt-4 text-center">
                           <button 
                             onClick={handleResetData}
                             className="text-red-400 text-xs hover:text-red-600 flex items-center justify-center gap-1 mx-auto hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                           >
                              <Trash2 size={12} /> 重置今日数据
                           </button>
                        </div>
                     )}
                  </div>
                )}
              </>
            )}
         </div>
      </div>
    </div>
  );
};

export default QueueManager;
