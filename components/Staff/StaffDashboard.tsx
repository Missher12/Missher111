import React, { useState, useMemo } from 'react';
import { Staff, Group, Announcement, AttendanceRecord, AttendanceConfig, AttendanceStatus } from '../../types';
import { Phone, Clock, CalendarDays, MapPin, Sun, Bell, Briefcase, Zap, Footprints, X, Shield, Users, ArrowUpRight } from 'lucide-react';
import Attendance from '../Attendance/Attendance';
import { maskPhone, getLocalDateKey } from '../../utils';
import { SurfaceCard, MetricCard, StatusBadge, Button } from '../ui/Kit';

interface StaffDashboardProps {
  currentUser: Staff;
  group?: Group;
  leaders?: Staff[]; 
  staffList: Staff[];
  announcements: Announcement[];
  attendanceStatus: AttendanceStatus;
  attendanceHistory?: AttendanceRecord[];
  attendanceConfig: AttendanceConfig;
  onClockIn: (photoUrl: string, status: AttendanceRecord['status'], timestamp: string) => void;
  onClockOut: (photoUrl: string, status: AttendanceRecord['status'], timestamp: string) => void;
  allowStaffViewTeam?: boolean;
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({
  currentUser,
  group,
  leaders = [],
  staffList,
  announcements,
  attendanceStatus,
  attendanceHistory = [],
  attendanceConfig,
  onClockIn,
  onClockOut,
  allowStaffViewTeam = true
}) => {
  const currentDate = new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' });
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const activeLeaders = leaders || [];
  const amILeader = group && currentUser.roles.some(r => r.groupId === group.id && r.isLeader);

  const todayKey = getLocalDateKey();
  const todaysRecords = attendanceHistory
    .filter(r => getLocalDateKey(r.timestamp) === todayKey)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const punchCount = todaysRecords.length;
  
  const hasInToday = todaysRecords.some(r => r.type === 'IN');
  const hasOutToday = todaysRecords.some(r => r.type === 'OUT');
  const isAttendanceCompleted = hasInToday && hasOutToday;

  const canViewTeammates = allowStaffViewTeam || amILeader;

  const teammates = useMemo(() => {
    if (!canViewTeammates) return [];
    return staffList.filter(s => 
      s.status === 'ACTIVE' && 
      s.id !== currentUser.id && 
      s.roles.some(r => r.groupId === group?.id)
    );
  }, [canViewTeammates, staffList, currentUser.id, group?.id]);

  return (
    <div className="animate-fade-in pb-16 space-y-6">
      
      {/* Header Banner - Sleek for Staff */}
      <div className="bg-white rounded-[18px] p-6 border border-[#E5EEF8] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-[#EAF4FF] text-[#1677FF] px-2.5 py-0.5 rounded-[10px] text-xs font-bold">
              STAFF MEMBER
            </span>
            <span className="text-xs text-[#7B93AA] font-medium flex items-center gap-1">
              <CalendarDays size={12} />
              {currentDate}
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#102A43]">
            您好，{currentUser.name}
          </h1>
          <p className="text-xs text-[#7B93AA]">
            欢迎回到工作台。所属分组：<span className="font-semibold text-[#1677FF]">{group?.name || '暂无编组'}</span> · 祝您今日现场工作顺利！
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-[10px] text-xs font-bold flex items-center gap-1.5 border ${
            attendanceStatus === 'CLOCKED_IN' 
              ? 'bg-emerald-50 text-[#22A06B] border-emerald-100' 
              : 'bg-amber-50 text-[#F59E0B] border-amber-100'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${attendanceStatus === 'CLOCKED_IN' ? 'bg-[#22A06B]' : 'bg-[#F59E0B]'}`}></span>
            {attendanceStatus === 'CLOCKED_IN' ? '正在工作中' : '当前休息中'}
          </span>
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        
        {/* Left Side: Clock-In Area. First on mobile via order-1 */}
        <div className="order-1 lg:col-span-2 space-y-6">
          <SurfaceCard className="p-5 md:p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <h2 className="font-bold text-sm text-[#102A43] flex items-center gap-2">
                <MapPin className="text-[#1677FF]" size={16} />
                安全拍照核销打卡
              </h2>
              <span className="text-[11px] font-bold text-[#7B93AA] bg-[#F8FBFF] px-2 py-1 rounded-[6px] border border-[#E5EEF8]">
                照片打卡终端
              </span>
            </div>
            
            {/* Real Camera Render Component */}
            <div className="flex-1 min-h-[400px]">
              <Attendance 
                onClockIn={onClockIn}
                onClockOut={onClockOut}
                status={attendanceStatus}
                isCompleted={isAttendanceCompleted}
                config={attendanceConfig}
              />
            </div>
          </SurfaceCard>
        </div>

        {/* Right Side: Primary Info & Stats. Second on mobile */}
        <div className="order-2 space-y-6">
          
          {/* Today's Punch Stats (Compact Cards Grid) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-[14px] border border-[#E5EEF8] flex flex-col justify-between h-[86px]">
              <span className="text-[10px] font-bold text-[#7B93AA] uppercase">今日班次</span>
              <p className="font-bold text-[#102A43] text-xs font-mono flex items-center gap-1.5 mt-2">
                <Clock size={12} className="text-[#1677FF]" />
                {attendanceConfig.startTime} - {attendanceConfig.endTime}
              </p>
            </div>
            <div className="bg-white p-4 rounded-[14px] border border-[#E5EEF8] flex flex-col justify-between h-[86px]">
              <span className="text-[10px] font-bold text-[#7B93AA] uppercase">今日打卡频次</span>
              <p className="font-bold text-[#102A43] text-xs flex items-center gap-1.5 mt-2">
                <Footprints size={12} className="text-[#22A06B]" />
                {punchCount} 次记录
              </p>
            </div>
          </div>

          {/* Group and Team Details (Weakened secondary layout) */}
          <div className="bg-white rounded-[14px] p-5 border border-[#E5EEF8] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <h3 className="font-bold text-[#102A43] text-xs flex items-center gap-2">
                <Briefcase size={14} className="text-[#1677FF]" /> 
                所属战队与指挥官
              </h3>
              <span className="text-[10px] bg-[#EAF4FF] text-[#1677FF] px-2 py-0.5 rounded-[6px] font-bold">
                {group?.name || '无分组'}
              </span>
            </div>

            {/* Leaders info - Simple clean list */}
            {activeLeaders.length > 0 ? (
              <div className="space-y-2 bg-[#F8FBFF] p-3 rounded-xl border border-[#E5EEF8]/60">
                <p className="text-[9px] font-bold text-[#1677FF] uppercase tracking-wider">
                  现场指挥官 (Leader)
                </p>
                {activeLeaders.map(l => (
                  <div key={l.id} className="flex items-center gap-2.5 pt-1">
                    <div className="w-7 h-7 rounded-full bg-[#EAF4FF] text-[#1677FF] flex items-center justify-center font-bold text-xs shrink-0">
                      {l.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#102A43] text-xs truncate">{l.name}</p>
                      <p className="text-[10px] text-[#486581] font-mono mt-0.5">{l.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-3 text-xs text-[#7B93AA] bg-slate-50 rounded-xl">
                暂无现场指挥官信息
              </div>
            )}

            {/* Teammates section - Compact grid list */}
            <div className="space-y-2 pt-1">
              <p className="text-[9px] font-bold text-[#7B93AA] uppercase tracking-wider">
                战队同组成员 ({teammates.length})
              </p>
              {canViewTeammates ? (
                teammates.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
                    {teammates.map(tm => (
                      <div key={tm.id} className="flex items-center gap-2 p-1.5 rounded-lg border border-[#E5EEF8] bg-white">
                        <div className="w-6 h-6 rounded-full bg-slate-50 text-[#7B93AA] border border-[#E5EEF8] flex items-center justify-center text-[10px] font-bold">
                          {tm.name[0]}
                        </div>
                        <span className="text-xs text-[#486581] font-semibold truncate">{tm.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#7B93AA] italic py-2 text-center bg-slate-50 rounded-lg">暂无其他同组人员</p>
                )
              ) : (
                <p className="text-[11px] text-[#F59E0B] py-2 text-center bg-amber-50/50 rounded-lg font-medium border border-dashed border-amber-100">当前排班成员隐私已隐藏</p>
              )}
            </div>
          </div>

          {/* Today's clock-in footprint log */}
          <div className="bg-white rounded-[14px] p-5 border border-[#E5EEF8] space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <h3 className="font-bold text-[#102A43] text-xs flex items-center gap-2">
                <Footprints size={14} className="text-[#22A06B]" />
                今日考勤足迹
              </h3>
              <span className="text-[10px] text-[#7B93AA] font-bold">同步成功</span>
            </div>

            <div className="space-y-3 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
              {todaysRecords.length === 0 ? (
                <div className="text-center py-6 text-[#7B93AA]">
                  <p className="text-xs">今日暂无打卡日志</p>
                </div>
              ) : (
                <div className="relative pl-1.5 space-y-3.5 before:absolute before:left-[4px] before:top-2 before:bottom-2 before:w-[1px] before:bg-[#E5EEF8]">
                  {todaysRecords.map((record) => (
                    <div key={record.id} className="relative pl-5 flex justify-between items-center">
                      <div className={`absolute left-0 top-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs z-10 ${record.type === 'IN' ? 'bg-[#22A06B]' : 'bg-[#F59E0B]'}`}></div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#102A43]">{record.type === 'IN' ? '上班登记' : '下班登记'}</p>
                        <p className="text-[10px] text-[#7B93AA] mt-0.5 flex items-center gap-1">
                          <span>{new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          <span>·</span>
                          <span className={record.status === 'NORMAL' ? 'text-[#7B93AA]' : 'text-[#E5484D] font-bold'}>
                            {record.status === 'NORMAL' ? '准时' : '迟到'}
                          </span>
                        </p>
                      </div>
                      {record.photoUrl && (
                        <div 
                          onClick={() => setSelectedPhoto(record.photoUrl || null)} 
                          className="w-8 h-8 rounded-[8px] overflow-hidden border border-[#E5EEF8] cursor-pointer hover:ring-2 hover:ring-blue-100 transition-all shrink-0"
                        >
                          <img src={record.photoUrl} alt="打卡" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Announcements block for Staff */}
          <div className="bg-white rounded-[14px] p-5 border border-[#E5EEF8] space-y-3">
            <h3 className="font-bold text-[#102A43] text-xs flex items-center gap-2">
              <Bell size={14} className="text-[#1677FF]" />
              最新通知
            </h3>
            <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
              {announcements.length === 0 ? (
                <p className="text-xs text-[#7B93AA] italic py-2 text-center bg-slate-50 rounded-lg">暂无新通知</p>
              ) : (
                announcements.map((notice) => (
                  <div 
                    key={notice.id} 
                    onClick={() => setSelectedAnnouncement(notice)}
                    className="p-2 rounded-[8px] bg-[#F8FBFF] border border-[#E5EEF8]/60 hover:border-[#1677FF]/40 hover:bg-white transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className={`text-[9px] px-1 rounded ${notice.isSticky ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-[#1677FF]'}`}>{notice.isSticky ? '置顶' : '通知'}</span>
                      <span className="text-[9px] text-[#7B93AA] font-mono">{notice.date}</span>
                    </div>
                    <p className="text-xs text-[#486581] font-semibold truncate group-hover:text-[#1677FF] transition-colors">{notice.title}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Lightbox for Clock-In Photo */}
      {selectedPhoto && (
         <div className="fixed inset-0 z-50 bg-[#102A43]/90 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedPhoto(null)}>
            <button className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors" onClick={() => setSelectedPhoto(null)}><X size={20} /></button>
            <img src={selectedPhoto} alt="打卡大图" className="max-w-full max-h-[85vh] rounded-[18px] shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()} />
         </div>
      )}

      {/* Lightbox for Announcement */}
      {selectedAnnouncement && (
         <div className="fixed inset-0 z-50 bg-[#102A43]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedAnnouncement(null)}>
            <div className="bg-white rounded-[18px] shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
               <div className="p-5 border-b border-slate-50 flex justify-between items-start bg-slate-50/20">
                  <div className="pr-4">
                     <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${selectedAnnouncement.isSticky ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-[#1677FF]'}`}>
                           {selectedAnnouncement.isSticky ? '置顶' : '通知'}
                        </span>
                        <span className="text-xs text-[#7B93AA] font-mono">{selectedAnnouncement.date}</span>
                     </div>
                     <h3 className="text-sm font-bold text-[#102A43] leading-snug">{selectedAnnouncement.title}</h3>
                  </div>
                  <button onClick={() => setSelectedAnnouncement(null)} className="text-slate-400 hover:text-slate-600 p-1 bg-white rounded-full border border-[#E5EEF8] hover:shadow-sm transition-colors"><X size={14} /></button>
               </div>
               
               <div className="p-5 overflow-y-auto custom-scrollbar">
                  <div className="text-[#486581] whitespace-pre-wrap leading-relaxed text-xs">
                     {selectedAnnouncement.content}
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-[#7B93AA] font-medium">
                     <span className="flex items-center gap-1"><Shield size={12} className="text-slate-300" /> 发布授权: {selectedAnnouncement.authorName}</span>
                     <span>STAFF SYSTEM 公告系统</span>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default StaffDashboard;
