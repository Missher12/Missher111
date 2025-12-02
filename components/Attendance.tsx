
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, MapPin, History, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, AttendanceConfig } from '../types';

interface AttendanceProps {
  onClockIn: (photoUrl: string, status: AttendanceRecord['status']) => void;
  onClockOut: (photoUrl: string, status: AttendanceRecord['status']) => void;
  status: AttendanceStatus;
  history: AttendanceRecord[];
  config: AttendanceConfig;
}

const Attendance: React.FC<AttendanceProps> = ({ onClockIn, onClockOut, status, history, config }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Initialize Camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError('无法访问摄像头，请检查权限。');
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Always keep camera on for this page, as both actions need photos
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Re-attach stream to video element if it exists but srcObject is lost (e.g. after tab switch/render)
  useEffect(() => {
    if (videoRef.current && stream && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, status]);

  const capturePhoto = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return null;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    
    return canvasRef.current.toDataURL('image/jpeg');
  };

  // Helper to calculate status based on config
  const calculateAttendanceStatus = (type: 'IN' | 'OUT'): 'NORMAL' | 'LATE' | 'EARLY_LEAVE' | 'OVERTIME' => {
    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }); // "HH:MM"
    
    // Compare times (simple string comparison works for HH:MM format)
    if (type === 'IN') {
      if (currentTimeStr > config.startTime) {
        return 'LATE';
      }
      return 'NORMAL';
    } else {
      // Clocking OUT
      if (currentTimeStr < config.endTime) {
        return 'EARLY_LEAVE';
      }
      if (currentTimeStr > config.overtimeStart) {
        return 'OVERTIME';
      }
      return 'NORMAL';
    }
  };

  const handleClockAction = async () => {
    setLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const photo = capturePhoto();
    
    if (photo) {
      if (status === AttendanceStatus.CLOCKED_OUT) {
        // Going to Clock In
        const resultStatus = calculateAttendanceStatus('IN');
        onClockIn(photo, resultStatus);
      } else {
        // Going to Clock Out
        const resultStatus = calculateAttendanceStatus('OUT');
        onClockOut(photo, resultStatus);
      }
    } else {
      setError("拍照失败，无法获取画面，请刷新重试。");
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">智能考勤</h1>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <History size={16} />
          {showHistory ? '收起记录' : '考勤记录'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Camera / Status Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          
          <div className="relative w-full aspect-video bg-gray-100 rounded-xl overflow-hidden mb-6 flex items-center justify-center group">
            {!error ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline
                  className="w-full h-full object-cover transform scale-x-[-1]" 
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <span className="bg-black/50 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                    <Camera size={12} /> 实时人脸验证
                  </span>
                </div>
              </>
            ) : (
               <div className="flex flex-col items-center text-gray-400">
                  <AlertCircle size={48} className="mb-2" />
                  <p>{error}</p>
               </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="space-y-4 w-full max-w-xs">
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
              <MapPin size={16} />
              <span>当前位置：北京市朝阳区 (模拟定位)</span>
            </div>

            <button
              onClick={handleClockAction}
              disabled={loading || !!error}
              className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                ${status === AttendanceStatus.CLOCKED_OUT 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30' 
                  : 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-red-500/30'
                }`}
            >
              {loading ? '处理中...' : (status === AttendanceStatus.CLOCKED_OUT ? '上班打卡' : '下班打卡')}
            </button>
            <p className="text-xs text-gray-400">
              {status === AttendanceStatus.CLOCKED_OUT ? '点击按钮将拍摄照片并记录上班时间' : '点击按钮将拍摄照片并记录下班时间'}
            </p>
          </div>
        </div>

        {/* Today's Summary & Rules */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4">今日考勤概览</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-gray-500">日期</span>
                <span className="font-medium text-gray-800">{new Date().toLocaleDateString('zh-CN')}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-gray-500">当前状态</span>
                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${status === AttendanceStatus.CLOCKED_IN ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {status === AttendanceStatus.CLOCKED_IN ? '工作中' : '已下班/休息'}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-500">本日工时</span>
                <span className="font-medium text-gray-800">-- 小时 -- 分钟</span>
              </div>
            </div>
          </div>
          
          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 text-sm">
             <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
               <Clock size={16} /> 当前考勤规则
             </h3>
             <ul className="space-y-2 text-indigo-800">
                <li className="flex justify-between"><span>上班时间:</span> <span className="font-mono font-bold">{config.startTime}</span></li>
                <li className="flex justify-between"><span>下班时间:</span> <span className="font-mono font-bold">{config.endTime}</span></li>
                <li className="flex justify-between"><span>加班起始:</span> <span className="font-mono font-bold">{config.overtimeStart}</span></li>
             </ul>
             <p className="text-xs text-indigo-400 mt-3 pt-3 border-t border-indigo-200">
               * 迟到、早退或加班将由系统自动判定并标记颜色。
             </p>
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in mt-8">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-800">历史记录</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-500 uppercase bg-gray-50">
                  <th className="px-6 py-3">时间</th>
                  <th className="px-6 py-3">类型</th>
                  <th className="px-6 py-3">状态/结果</th>
                  <th className="px-6 py-3">验证照片</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.length === 0 ? (
                   <tr>
                     <td colSpan={4} className="px-6 py-8 text-center text-gray-500">暂无记录</td>
                   </tr>
                ) : (
                  history.slice().reverse().map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {new Date(record.timestamp).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          record.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {record.type === 'IN' ? '上班' : '下班'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                         {record.status === 'NORMAL' && <span className="text-xs text-gray-500">正常</span>}
                         {record.status === 'LATE' && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">迟到</span>}
                         {record.status === 'EARLY_LEAVE' && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">早退</span>}
                         {record.status === 'OVERTIME' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">加班</span>}
                      </td>
                      <td className="px-6 py-4">
                        {record.photoUrl ? (
                          <div className="h-8 w-8 rounded-full overflow-hidden border border-gray-200 group relative">
                            <img src={record.photoUrl} alt="verification" className="w-full h-full object-cover" />
                             <div className="absolute hidden group-hover:block top-0 left-10 z-10 w-32 h-32 rounded-lg border-2 border-white shadow-xl overflow-hidden pointer-events-none">
                                <img src={record.photoUrl} alt="zoom" className="w-full h-full object-cover" />
                             </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">无</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
