
import React, { useState } from 'react';
import { Staff, Group, Announcement, AttendanceRecord, AttendanceConfig, AttendanceStatus } from '../../types';
import { Phone, Clock, CalendarDays, MapPin, Sun, Bell, Briefcase, Zap, Footprints, Image as ImageIcon, X, Shield, Users, FileText } from 'lucide-react';
import Attendance from '../Attendance/Attendance';
import { maskPhone } from '../../utils';

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
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({
  currentUser,
  group,
  leaders,
  staffList,
  announcements,
  attendanceStatus,
  attendanceHistory = [],
  attendanceConfig,
  onClockIn,
  onClockOut
}) => {
  const currentDate = new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' });
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const activeLeaders = leaders || [];
  const amILeader = group && currentUser.roles.some(r => r.groupId === group.id && r.isLeader);
  const punchCount = attendanceHistory.length;
  const todaysRecords = [...attendanceHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const teammates = staffList.filter(s => 
    s.status === 'ACTIVE' && 
    s.id !== currentUser.id && 
    s.roles.some(r => r.groupId === group?.id)
  );

  return (
    <div className="animate-fade-in pb-24 md:pb-10 w-full">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 mt-4 gap-4">
         <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">工作台</h1>
            <p className="text-gray-500 text-sm">欢迎回来，{currentUser.name}。祝你今天工作顺利！</p>
         </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-[14px] border border-[#E5EEF8] shadow-sm flex flex-col justify-between h-24">
           <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase">今日日期</span>
              <CalendarDays size={16} className="text-[#1677FF]" />
           </div>
           <p className="font-bold text-[#102A43] text-sm">{currentDate}</p>
        </div>
        <div className="bg-white p-4 rounded-[14px] border border-[#E5EEF8] shadow-sm flex flex-col justify-between h-24">
           <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase">班次时间</span>
              <Clock size={16} className="text-orange-500" />
           </div>
           <p className="font-bold text-[#102A43] text-sm font-mono">{attendanceConfig.startTime} - {attendanceConfig.endTime}</p>
        </div>
        <div className="bg-white p-4 rounded-[14px] border border-[#E5EEF8] shadow-sm flex flex-col justify-between h-24">
           <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase">当前状态</span>
              <Zap size={16} className={attendanceStatus === 'CLOCKED_IN' ? "text-green-500" : "text-slate-300"} />
           </div>
           <p className={`font-bold text-sm ${attendanceStatus === 'CLOCKED_IN' ? 'text-green-600' : 'text-slate-400'}`}>
              {attendanceStatus === 'CLOCKED_IN' ? '工作中' : '休息中'}
           </p>
        </div>
        <div className="bg-gradient-to-br from-[#1677FF] to-[#0B5FCC] p-4 rounded-[14px] shadow-sm text-white flex flex-col justify-between h-24 border border-[#1677FF]/10">
           <div className="flex justify-between items-start opacity-85">
              <span className="text-[10px] font-bold uppercase text-blue-100">今日打卡</span>
              <Footprints size={16} />
           </div>
           <p className="font-bold text-sm text-white">{punchCount} 次记录</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Attendance Area */}
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-white rounded-[18px] p-6 md:p-8 shadow-sm border border-[#E5EEF8] h-[600px] flex flex-col relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 relative z-10">
                   <h2 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                      <MapPin className="text-[#1677FF]" size={24} /> 考勤打卡
                   </h2>
                   <span className="bg-sky-50 text-[#1677FF] text-xs px-2.5 py-1 rounded-full font-semibold border border-sky-100 flex items-center gap-1">
                      智能考勤终端
                   </span>
                </div>
                <div className="flex-1 relative z-10">
                   <Attendance 
                      onClockIn={onClockIn}
                      onClockOut={onClockOut}
                      status={attendanceStatus}
                      config={attendanceConfig}
                   />
                </div>
             </div>
          </div>

          {/* Info Sidebar */}
          <div className="space-y-6 flex flex-col">
             
             {/* Group Info */}
             <div className="bg-white rounded-[14px] p-6 shadow-sm border border-[#E5EEF8]">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Briefcase size={20} className="text-[#1677FF]" /> 所属分组
                   </h3>
                   <span className="text-xs bg-blue-50 text-[#1677FF] px-2 py-1 rounded-lg font-bold border border-blue-100/30">
                      {group?.name || '未分配'}
                   </span>
                </div>

                {/* Leader */}
                <div className="bg-blue-50/60 rounded-xl p-4 mb-4 border border-blue-100/50">
                   <p className="text-[10px] text-[#1677FF] font-bold uppercase mb-2 flex items-center gap-1">
                      <Shield size={10} /> 组长信息
                   </p>
                   {activeLeaders.length > 0 ? (
                      <div className="space-y-3">
                        {activeLeaders.map(l => (
                          <div key={l.id} className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-blue-100 text-[#1677FF] flex items-center justify-center font-bold text-sm shrink-0">
                                {l.name[0]}
                             </div>
                             <div className="min-w-0">
                                <p className="font-bold text-gray-800 text-sm truncate">{l.name}</p>
                                <p className="text-xs text-[#0B5FCC] flex items-center gap-1 font-mono truncate">
                                   <Phone size={10} /> {l.phone || '无电话'}
                                </p>
                             </div>
                          </div>
                        ))}
                      </div>
                   ) : (
                      <p className="text-xs text-gray-400 italic">暂无组长</p>
                   )}
                </div>

                {/* Teammates */}
                <div>
                   <p className="text-[10px] text-gray-400 font-bold uppercase mb-3 flex items-center gap-1">
                      <Users size={10} /> 同组成员 ({teammates.length})
                   </p>
                   {teammates.length > 0 ? (
                      <div className="space-y-3 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                         {teammates.map(tm => (
                            <div key={tm.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                               <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold">
                                     {tm.name[0]}
                                  </div>
                                  <span className="text-sm text-gray-700 font-medium">{tm.name}</span>
                               </div>
                               <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded">
                                  {amILeader ? tm.phone : maskPhone(tm.phone)}
                               </span>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">暂无其他成员</p>
                   )}
                </div>
             </div>

             {/* Punch History */}
             <div className="bg-white rounded-[14px] p-6 shadow-sm border border-[#E5EEF8] flex-1 min-h-[220px]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E5EEF8]">
                   <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Footprints size={18} className="text-[#1677FF]" /> 今日足迹
                   </h3>
                   <span className="bg-blue-50 text-[#1677FF] text-[10px] px-2 py-0.5 rounded-full font-bold">{punchCount} 次打卡</span>
                </div>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                   {todaysRecords.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                         <Clock size={32} className="mx-auto mb-2 opacity-20" />
                         <p className="text-xs">今天还没有打卡记录哦</p>
                      </div>
                   ) : (
                      <div className="relative pl-2 space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                         {todaysRecords.map((record) => (
                            <div key={record.id} className="relative pl-6 group">
                               <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10 ${record.type === 'IN' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                               <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                     <p className="text-sm font-bold text-gray-800">{record.type === 'IN' ? '上班打卡' : '下班打卡'}</p>
                                     <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <Clock size={10} /> {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        <span className="mx-1">·</span> 
                                        <span className={`font-bold ${record.status === 'NORMAL' ? 'text-gray-400' : 'text-red-500'}`}>{record.status === 'NORMAL' ? '正常' : record.status}</span>
                                     </p>
                                  </div>
                                  {record.photoUrl && (
                                     <div onClick={() => setSelectedPhoto(record.photoUrl || null)} className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-pointer hover:ring-2 hover:ring-sky-200 transition-all shrink-0">
                                        <img src={record.photoUrl} alt="打卡" className="w-full h-full object-cover" />
                                     </div>
                                  )}
                               </div>
                            </div>
                         ))}
                      </div>
                   )}
                </div>
             </div>

             {/* Announcements */}
             <div className="bg-white rounded-[14px] p-5 shadow-sm border border-[#E5EEF8] max-h-[200px] flex flex-col">
                <div className="flex justify-between items-center mb-3 shrink-0">
                   <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Bell size={16} className="text-[#1677FF]" /> 通知公告</h3>
                </div>
                <div className="overflow-y-auto pr-1 custom-scrollbar space-y-2">
                   {announcements.length === 0 ? <p className="text-xs text-gray-300 text-center py-4">暂无新通知</p> : announcements.map((notice) => (
                         <div 
                           key={notice.id} 
                           onClick={() => setSelectedAnnouncement(notice)}
                           className="p-2 rounded-lg bg-slate-50 border border-[#E5EEF8] hover:bg-white hover:border-blue-100 hover:shadow-sm transition-all cursor-pointer group"
                         >
                            <div className="flex justify-between items-center mb-0.5">
                               <span className={`text-[10px] px-1 rounded ${notice.isSticky ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-[#1677FF]'}`}>{notice.isSticky ? '置顶' : '通知'}</span>
                               <span className="text-[10px] text-gray-400">{notice.date}</span>
                            </div>
                            <p className="text-xs text-gray-700 truncate group-hover:text-[#1677FF] transition-colors">{notice.title}</p>
                         </div>
                   ))}
                </div>
             </div>
          </div>
      </div>

      {selectedPhoto && (
         <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedPhoto(null)}>
            <button className="absolute top-4 right-4 p-2 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors" onClick={() => setSelectedPhoto(null)}><X size={24} /></button>
            <img src={selectedPhoto} alt="打卡大图" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()} />
         </div>
      )}

      {selectedAnnouncement && (
         <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedAnnouncement(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
               <div className="p-6 border-b border-[#E5EEF8] flex justify-between items-start">
                  <div className="pr-4">
                     <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${selectedAnnouncement.isSticky ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                           {selectedAnnouncement.isSticky ? '置顶' : '通知'}
                        </span>
                        <span className="text-xs text-gray-400">{selectedAnnouncement.date}</span>
                     </div>
                     <h3 className="text-xl font-bold text-gray-800 leading-snug">{selectedAnnouncement.title}</h3>
                  </div>
                  <button onClick={() => setSelectedAnnouncement(null)} className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"><X size={20} /></button>
               </div>
               
               <div className="p-6 overflow-y-auto custom-scrollbar">
                  <div className="prose prose-sm prose-sky max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed">
                     {selectedAnnouncement.content}
                  </div>
                  <div className="mt-8 pt-4 border-t border-[#E5EEF8] flex items-center justify-between text-xs text-gray-400">
                     <span className="flex items-center gap-1"><Shield size={12} /> 发布人: {selectedAnnouncement.authorName}</span>
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
