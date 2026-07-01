
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, AttendanceConfig } from '../../types';
import { calculateAttendanceStatus } from '../../utils';

interface AttendanceProps {
  onClockIn: (photoUrl: string, status: AttendanceRecord['status'], timestamp: string) => void;
  onClockOut: (photoUrl: string, status: AttendanceRecord['status'], timestamp: string) => void;
  status: AttendanceStatus;
  config: AttendanceConfig;
}

const Attendance: React.FC<AttendanceProps> = ({ onClockIn, onClockOut, status, config }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second for display
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const startCamera = async () => {
    try {
      setIsCameraReady(false);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
              facingMode: { ideal: 'user' },
              width: { ideal: 1280 }, // Optimize resolution for backend
              height: { ideal: 720 }
          } 
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
      setError('');
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError('无法访问摄像头，请检查权限。');
      setIsCameraReady(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [status]);

  // Capture Photo - Returns both DataURL (for preview) and Blob (for upload)
  const capturePhotoData = (): Promise<{ dataUrl: string; blob: Blob } | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || !canvasRef.current) {
        resolve(null);
        return;
      }
      const context = canvasRef.current.getContext('2d');
      if (!context) {
        resolve(null);
        return;
      }
      
      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;
      
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      
      // Draw Video
      context.drawImage(videoRef.current, 0, 0, width, height);
      
      // Add Watermark
      const gradient = context.createLinearGradient(0, height - 120, 0, height);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(1, "rgba(0,0,0,0.8)");
      context.fillStyle = gradient;
      context.fillRect(0, height - 120, width, 120);

      const now = new Date();
      context.shadowColor = "rgba(0,0,0,0.5)";
      context.shadowBlur = 4;
      context.fillStyle = "white";
      const fontStack = "'SimHei', 'Heiti SC', 'Microsoft YaHei', sans-serif";
      const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
      const timeFontSize = Math.max(32, width / 12); 
      context.font = `bold ${timeFontSize}px ${fontStack}`;
      context.textAlign = "right";
      context.fillText(timeStr, width - 20, height - 30);
      const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
      context.font = `bold 20px ${fontStack}`;
      context.fillText(dateStr, width - 20, height - (timeFontSize + 20));

      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8); // 80% quality
      
      canvasRef.current.toBlob((blob) => {
        if (blob) resolve({ dataUrl, blob });
        else resolve(null);
      }, 'image/jpeg', 0.8);
    });
  };

  const handleClockAction = async () => {
    const clickTime = new Date(); 
    setLoading(true);
    
    const photoData = await capturePhotoData();
    
    // BACKEND INTEGRATION NOTE:
    // Here you would typically call `api.upload('/upload/attendance', photoData.blob)`
    // and receive a cloud URL (e.g., https://oss.example.com/photo123.jpg) back.
    // For now, we still pass the DataURL to maintain current functionality.
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (photoData) {
      if (status === AttendanceStatus.CLOCKED_OUT) {
        const resultStatus = calculateAttendanceStatus('IN', clickTime, config);
        onClockIn(photoData.dataUrl, resultStatus, clickTime.toISOString());
      } else {
        const resultStatus = calculateAttendanceStatus('OUT', clickTime, config);
        onClockOut(photoData.dataUrl, resultStatus, clickTime.toISOString());
      }
    } else {
      setError("拍照失败，请刷新重试。");
    }
    setLoading(false);
  };

  const getDayProgress = () => {
    const now = currentTime;
    const start = new Date(now).setHours(parseInt(config.startTime.split(':')[0]), 0, 0, 0);
    const end = new Date(now).setHours(parseInt(config.endTime.split(':')[0]), 0, 0, 0);
    const total = end - start;
    const current = now.getTime() - start;
    return Math.min(Math.max((current / total) * 100, 0), 100);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative w-full flex-1 min-h-[300px] bg-black rounded-3xl overflow-hidden shadow-inner ring-1 ring-black/5 group">
        {!error ? (
          <>
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1] opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2">
               <div className={`w-2 h-2 ${isCameraReady ? 'bg-green-400' : 'bg-amber-400 animate-pulse'} rounded-full`}></div>
               <span className="text-[10px] font-medium text-white tracking-wider">
                  {isCameraReady ? '摄像头就绪' : '摄像头连接中...'}
               </span>
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
               <div>
                  <p className="text-white/80 text-xs font-medium tracking-widest uppercase mb-1">当前时间</p>
                  <p className="text-white text-3xl font-bold font-mono tracking-tighter leading-none">{currentTime.toLocaleTimeString([], { hour12: false })}</p>
               </div>
               <div className="text-right">
                  <p className="text-white/80 text-xs font-medium tracking-widest uppercase mb-1">当前状态</p>
                  <p className="text-white font-bold flex items-center gap-1 justify-end">
                     {status === AttendanceStatus.CLOCKED_OUT ? '未签到' : '工作中'}
                     {status === AttendanceStatus.CLOCKED_IN && <div className="w-2 h-2 bg-green-400 rounded-full"></div>}
                  </p>
               </div>
            </div>
          </>
        ) : (
           <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6 text-center bg-gray-100">
              <AlertCircle size={32} className="text-red-400 mb-2" />
              <p className="text-sm font-medium text-gray-800">{error}</p>
              <button onClick={startCamera} className="mt-4 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold shadow-sm">重试</button>
           </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="mt-6 mb-2 px-1">
         <div className="flex justify-between text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
            <span>上班 {config.startTime}</span>
            <span>下班 {config.endTime}</span>
         </div>
         <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-sky-400 to-[#1677FF] transition-all duration-1000" style={{ width: `${getDayProgress()}%` }}></div>
         </div>
      </div>

      <div className="mt-4">
        <button
          onClick={handleClockAction}
          disabled={loading || !isCameraReady || !!error}
          className={`w-full py-4 rounded-2xl font-black text-lg text-white shadow-lg transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 relative overflow-hidden group
            ${status === AttendanceStatus.CLOCKED_OUT ? 'bg-gray-900 hover:bg-black shadow-gray-200' : 'bg-[#1677FF] hover:bg-[#0B5FCC] shadow-sky-200'}`}
        >
          {loading ? <Clock className="animate-spin" size={24} /> : (
             <>
                {status === AttendanceStatus.CLOCKED_OUT ? <Clock size={20} className="group-hover:scale-110 transition-transform" /> : <CheckCircle2 size={20} />}
                <span>{status === AttendanceStatus.CLOCKED_OUT ? '上班打卡 (Clock In)' : '下班打卡 (Clock Out)'}</span>
             </>
          )}
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">点击按钮以确认记录当前时间</p>
      </div>
    </div>
  );
};

export default Attendance;
