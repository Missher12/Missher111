import React, { useMemo, useState } from 'react';
import { 
  Users, 
  Clock, 
  Megaphone, 
  CheckCircle2, 
  CalendarDays, 
  Sun, 
  Moon, 
  ArrowRight,
  TrendingUp,
  Activity,
  Shield,
  BarChart3,
  UserCheck,
  UserX,
  X,
  Bell,
  Sparkles,
  PieChart,
  FileSpreadsheet
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AttendanceRecord, QueueTicket, Announcement, Staff, Group, GroupRole } from '../../types';

interface DashboardProps {
  attendanceRecords: AttendanceRecord[];
  queueData: QueueTicket[];
  announcements: Announcement[];
  isAdmin: boolean;
  groupInfo?: GroupRole;
  staffList: Staff[];
  groups: Group[];
  currentUser?: Staff;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  attendanceRecords, 
  queueData,
  announcements, 
  isAdmin, 
  staffList, 
  groups,
  currentUser
}) => {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  
  // 1. Calculate Personal Stats (Only for Non-Admin)
  const myRecords = useMemo(() => {
    if (isAdmin || !currentUser) return [];
    return attendanceRecords
      .filter(r => r.staffId === currentUser.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [attendanceRecords, currentUser, isAdmin]);

  const lastClockIn = useMemo(() => {
    return myRecords.find(r => r.type === 'IN');
  }, [myRecords]);

  // 2. Global Stats for Admin
  const globalStats = useMemo(() => {
     if (!isAdmin) return null;
     const todayStr = new Date().toDateString();
     
     const todayRecords = attendanceRecords.filter(r => new Date(r.timestamp).toDateString() === todayStr && r.type === 'IN');
     const presentStaffIds = new Set(todayRecords.map(r => r.staffId));
     const activeStaffCount = staffList.filter(s => s.status === 'ACTIVE').length;
     const presentCount = presentStaffIds.size;
     
     return {
        present: presentCount,
        total: activeStaffCount,
        rate: activeStaffCount > 0 ? Math.round((presentCount / activeStaffCount) * 100) : 0,
        missing: Math.max(0, activeStaffCount - presentCount),
        late: todayRecords.filter(r => r.status === 'LATE').length
     };
  }, [attendanceRecords, staffList, isAdmin]);

  // 3. Recharts check-in trend data logic based on real check-in times
  const trendData = useMemo(() => {
    const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00', '18:00'];
    const todayStr = new Date().toDateString();
    
    return hours.map(h => {
      const targetHour = parseInt(h.split(':')[0]);
      const count = attendanceRecords.filter(r => {
        const d = new Date(r.timestamp);
        return d.toDateString() === todayStr && d.getHours() <= targetHour && r.type === 'IN';
      }).length;
      return { time: h, '签到人数': count };
    });
  }, [attendanceRecords]);

  // 4. Calculate Group Stats
  const todayStr = new Date().toDateString();
  const groupStats = useMemo(() => {
    return groups.map(group => {
      const groupStaff = staffList.filter(s => s.status === 'ACTIVE' && s.roles.some(r => r.groupId === group.id));
      const total = groupStaff.length;

      const presentCount = groupStaff.filter(s => {
         return attendanceRecords.some(r => 
            r.staffId === s.id && 
            r.type === 'IN' && 
            new Date(r.timestamp).toDateString() === todayStr
         );
      }).length;

      return {
        id: group.id,
        name: group.name,
        total,
        present: presentCount,
        rate: total > 0 ? Math.round((presentCount / total) * 100) : 0
      };
    });
  }, [groups, staffList, attendanceRecords, todayStr]);

  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => {
      if (a.isSticky && !b.isSticky) return -1;
      if (!a.isSticky && b.isSticky) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [announcements]);

  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour < 5) return '夜深了，注意休息';
    if (hour < 9) return '早上好，新的一天元气满满';
    if (hour < 12) return '上午好，保持专注哦';
    if (hour < 14) return '中午好，下午也要加油';
    if (hour < 18) return '下午好，今天收获满满';
    return '晚上好，今天辛苦了';
  };

  return (
    <div className="space-y-6 animate-fade-in w-full">
      {/* Dynamic Upper Hero Welcomer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Welcome Premium Box */}
        <div className="lg:col-span-2 bg-gradient-to-br from-[#1677FF] via-[#1062D6] to-[#0B5FCC] rounded-[2rem] p-8 text-white shadow-lg shadow-blue-500/10 relative overflow-hidden group min-h-[240px] flex flex-col justify-between border border-[#1677FF]/10 animate-fade-in">
           {/* Abstract Orbs */}
           <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110"></div>
           <div className="absolute -bottom-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
           
           <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center justify-between">
                 <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-white border border-white/10 flex items-center gap-1.5">
                    <CalendarDays size={13} className="text-white" />
                    {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                 </span>
                 {isAdmin && (
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-white border border-white/10 flex items-center gap-1.5">
                        <Shield size={13} /> 企业高级管理员
                    </span>
                 )}
              </div>
              <div>
                 <p className="text-blue-100 text-sm font-medium tracking-wide mb-1 flex items-center gap-1.5">
                   <Sparkles size={14} className="text-yellow-300 animate-pulse" /> {getGreetingText()}
                 </p>
                 <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
                    {isAdmin ? '管理员工作台' : currentUser?.name}
                 </h1>
                 <p className="text-blue-50 text-xs md:text-sm mt-2 max-w-lg leading-relaxed">
                    {isAdmin ? '系统正常运转中，所有入职报名、分组排班以及现场签到数据正在实时同步。' : '欢迎回到控制中心，请核对您的今日排班时间、考勤记录并查看最新团队公告。'}
                 </p>
              </div>
           </div>
        </div>

        {/* Dynamic Analytics / Dial Card */}
        {isAdmin && globalStats ? (
            <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-[#E5EEF8] flex flex-col justify-between hover:shadow-md hover:border-blue-100 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute -top-6 -right-6 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-blue-600">
                    <BarChart3 size={120} />
                </div>
                <div>
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                         <Activity size={13} className="text-[#1677FF]" strokeWidth={3} /> 今日签到总览
                      </p>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                         打卡率 {globalStats.rate}%
                      </span>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-blue-50 text-[#1677FF] rounded-2xl flex items-center justify-center border border-blue-100/40 shadow-sm">
                            <Users size={24} strokeWidth={2.5} className="text-[#1677FF]" />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-extrabold text-[#102A43] text-3xl tracking-tight leading-none">
                                  {globalStats.present}
                              </span>
                              <span className="text-slate-400 text-sm font-medium">/ {globalStats.total} 人</span>
                            </div>
                            <p className="text-xs text-slate-500 font-semibold mt-1">当前在册活跃状态人数</p>
                        </div>
                    </div>
                </div>
                
                <div className="mt-5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-[#486581] font-medium">签到进度</span>
                        <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-lg">{globalStats.missing} 人未打卡</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-50">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${globalStats.rate >= 90 ? 'from-emerald-400 to-emerald-500' : 'from-[#1677FF] to-[#0B5FCC]'}`} 
                            style={{width: `${globalStats.rate}%`}}
                        ></div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-[#E5EEF8] flex flex-col justify-between hover:shadow-md hover:border-blue-100 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute -top-6 -right-6 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-slate-900">
                    <Clock size={120} />
                </div>
                <div>
                    <p className="text-[#7B93AA] text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Clock size={13} className="text-emerald-500" strokeWidth={3} /> 今日打卡状态
                    </p>
                    <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${lastClockIn ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' : 'bg-slate-50 border border-slate-150 text-slate-400'}`}>
                            <Clock size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-[#102A43] text-3xl tracking-tight leading-none">
                            {lastClockIn ? new Date(lastClockIn.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                            </h3>
                            <p className="text-xs text-slate-500 font-semibold mt-1">当日首次上班打卡时间</p>
                        </div>
                    </div>
                </div>
                
                <div className="mt-5">
                    {lastClockIn ? (
                        <div className="bg-emerald-50/70 text-emerald-700 px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between border border-emerald-100">
                            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> 开工状态：在线</span>
                            <span className="text-[10px] uppercase font-mono bg-emerald-500 text-white px-2 py-0.5 rounded-md">Working</span>
                        </div>
                    ) : (
                        <div className="bg-slate-50/70 text-slate-500 px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between border border-[#E5EEF8]">
                            <span className="flex items-center gap-1.5"><Moon size={14} className="text-slate-400" /> 未检测到本日签到</span>
                            <span className="text-[10px] uppercase font-mono bg-slate-300 text-slate-700 px-2 py-0.5 rounded-md">Off-Duty</span>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Main Grid: Data Visualization & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Live Performance / Group Pulse */}
         <div className="lg:col-span-2 space-y-6">
            
             {/* Realtime Graph Check-in (Show on Admin only) */}
             {isAdmin && (
                <div className="bg-white p-6 rounded-[2rem] border border-[#E5EEF8] shadow-sm hover:shadow-md transition-shadow">
                   <div className="flex justify-between items-center mb-4">
                      <div>
                         <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <BarchartIcon className="text-[#1677FF] w-4 h-4" /> 今日签到时间走势图
                         </h3>
                         <p className="text-xs text-[#7B93AA] mt-0.5">计算截止目前，系统各时间段签到的累计人数分布</p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-[#F5F9FF] text-slate-500 border border-[#E5EEF8]">当日统计</span>
                   </div>
                   <div className="h-[200px] w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                               <linearGradient id="colorSign" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#1677FF" stopOpacity={0.25}/>
                                  <stop offset="95%" stopColor="#1677FF" stopOpacity={0.01}/>
                               </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EEF8" />
                            <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} width={40} />
                            <Tooltip contentStyle={{ background: '#0F172A', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                            <Area type="monotone" dataKey="签到人数" stroke="#1677FF" strokeWidth={3} fillOpacity={1} fill="url(#colorSign)" />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             )}

             {/* Reorganized Group Attendance Stats */}
             <div>
                <div className="flex items-center justify-between mb-4 px-1">
                   <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                      <Users size={18} className="text-[#1677FF]" />
                      各组织架构实时出勤
                   </h2>
                   <span className="text-[11px] font-bold text-[#7B93AA] bg-white border border-[#E5EEF8] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> 系统实时监控
                   </span>
                </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groupStats.length === 0 ? (
                     <div className="col-span-full p-12 bg-white rounded-[2rem] text-center text-slate-400 border border-dashed border-slate-200">
                        <p className="text-sm">暂无部门或分组数据</p>
                     </div>
                  ) : (
                     groupStats.map((group) => (
                        <div key={group.id} className="bg-white p-5 rounded-2xl border border-[#E5EEF8] hover:shadow-md hover:border-blue-100 hover:-translate-y-0.5 transition-all duration-300 group flex flex-col justify-between">
                           
                           <div className="flex justify-between items-start mb-3">
                              <div>
                                 <h3 className="font-extrabold text-slate-800 text-sm tracking-tight truncate max-w-[150px]" title={group.name}>
                                    {group.name}
                                 </h3>
                                 <p className="text-[10px] text-slate-400 mt-0.5">编制限制数：{group.total} 人</p>
                              </div>
                              <div className={`flex items-center gap-0.5 text-xs font-extrabold px-2 py-0.5 rounded-md ${
                                 group.rate >= 90 ? 'bg-emerald-50 text-emerald-600' : 
                                 group.rate >= 70 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                 <TrendingUp size={11} /> {group.rate}%
                              </div>
                           </div>
                           
                           <div className="space-y-2 mt-2">
                              {/* Slender Progress Bar */}
                              <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden">
                                 <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                       group.rate >= 90 ? 'bg-emerald-500' : 
                                       group.rate >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`} 
                                    style={{ width: `${group.rate}%` }}
                                 ></div>
                              </div>
                              <div className="flex justify-between text-xs font-bold text-slate-400">
                                 <span className="flex items-center gap-1.5"><UserCheck size={12} className="text-slate-300" /> 签到 {group.present} 人</span>
                                 <span className="flex items-center gap-1.5"><UserX size={12} className="text-slate-300" /> 未到 {Math.max(0, group.total - group.present)}</span>
                              </div>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>
         </div>

         {/* Right Column: Dynamic Feed notifications */}
         <div className="flex flex-col gap-6">
            {/* Announcement Board Section */}
            <div className="bg-white rounded-[2rem] p-6 border border-[#E5EEF8] shadow-sm flex flex-col h-full min-h-[360px] hover:shadow-md transition-shadow">
               <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                     <Bell size={16} className="text-amber-500" /> 最新通知公告
                  </h3>
                  {sortedAnnouncements.length > 0 && (
                     <span className="text-[10px] bg-blue-50 text-[#1677FF] px-2 py-0.5 rounded-full font-bold">
                        {sortedAnnouncements.length} 篇
                     </span>
                  )}
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3 max-h-[460px]">
                  {sortedAnnouncements.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-12">
                        <Megaphone size={28} className="mb-2 opacity-20 text-slate-500" />
                        <p className="text-xs">暂无企业、组内通知公告</p>
                     </div>
                  ) : (
                     sortedAnnouncements.slice(0, 6).map(ann => (
                        <div 
                           key={ann.id}
                           onClick={() => setSelectedAnnouncement(ann)}
                           className="p-3.5 rounded-xl bg-slate-50 border border-[#E5EEF8]/50 hover:bg-white hover:border-blue-100 hover:shadow-sm transition-all cursor-pointer group"
                        >
                           <div className="flex justify-between items-center mb-1.5">
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${ann.isSticky ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-[#1677FF]'}`}>
                                 {ann.isSticky ? '置顶' : '常规'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">{ann.date}</span>
                           </div>
                           <h4 className="font-extrabold text-slate-800 text-xs line-clamp-1 group-hover:text-[#1677FF] transition-colors">
                              {ann.title}
                           </h4>
                           <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-normal">
                              {ann.content}
                           </p>
                        </div>
                     ))
                  )}
               </div>
            </div>
         </div>
      </div>

      {/* Marquee Ticker */}
      {sortedAnnouncements.length > 0 && (
         <div className="bg-white rounded-full p-1 border border-[#E5EEF8] shadow-sm flex items-center">
            <div className="bg-rose-50 text-rose-600 p-2 rounded-full m-0.5 shrink-0">
               <Megaphone size={14} className="animate-bounce" />
            </div>
            <div className="flex-1 px-3 overflow-hidden">
               <div className="animate-marquee whitespace-nowrap flex items-center gap-10">
                  {sortedAnnouncements.map(ann => (
                     <span 
                        key={ann.id} 
                        onClick={() => setSelectedAnnouncement(ann)}
                        className="text-xs font-bold text-slate-600 flex items-center gap-2 cursor-pointer hover:text-[#1677FF] transition-colors shrink-0"
                     >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        {ann.title}
                     </span>
                  ))}
               </div>
            </div>
         </div>
      )}

      {/* Corporate Pulse Metrics Grid (Large Cards) */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white p-5 rounded-3xl border border-[#E5EEF8] shadow-sm hover:border-blue-100 flex flex-col items-center justify-center text-center cursor-default group transition-all">
                <div className="p-3 rounded-2xl bg-blue-50 text-[#1677FF] mb-2 group-hover:scale-105 transition-transform">
                   <Users size={18} />
                </div>
                <h4 className="text-2xl font-black text-[#102A43] leading-none">{staffList.length}</h4>
                <p className="text-[10px] font-bold text-[#7B93AA] uppercase tracking-widest mt-1.5">花名册在职人数</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-[#E5EEF8] shadow-sm hover:border-blue-100 flex flex-col items-center justify-center text-center cursor-default group transition-all">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 mb-2 group-hover:scale-105 transition-transform">
                   <FileSpreadsheet size={18} />
                </div>
                <h4 className="text-2xl font-black text-[#102A43] leading-none">{attendanceRecords.length}</h4>
                <p className="text-[10px] font-bold text-[#7B93AA] uppercase tracking-widest mt-1.5">今日累计打卡频次</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-[#E5EEF8] shadow-sm hover:border-blue-100 flex flex-col items-center justify-center text-center cursor-default group transition-all">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 mb-2 group-hover:scale-105 transition-transform">
                   <Clock size={18} />
                </div>
                <h4 className="text-2xl font-black text-[#102A43] leading-none">{queueData.length}</h4>
                <p className="text-[10px] font-bold text-[#7B93AA] uppercase tracking-widest mt-1.5">现场申报人数</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-[#E5EEF8] shadow-sm hover:border-blue-100 flex flex-col items-center justify-center text-center cursor-default group transition-all">
                <div className="p-3 rounded-2xl bg-blue-50 text-[#1677FF] mb-2 group-hover:scale-105 transition-transform">
                   <PieChart size={18} />
                </div>
                <h4 className="text-2xl font-black text-[#102A43] leading-none">{groups.length}</h4>
                <p className="text-[10px] font-bold text-[#7B93AA] uppercase tracking-widest mt-1.5">已激活战队编组</p>
            </div>
        </div>
      )}

      {/* Announcement Details Modal */}
      {selectedAnnouncement && (
         <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedAnnouncement(null)}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] border border-[#E5EEF8]" onClick={(e) => e.stopPropagation()}>
               <div className="p-6 border-b border-slate-50 flex justify-between items-start bg-slate-50/50">
                  <div className="pr-4">
                     <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${selectedAnnouncement.isSticky ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-[#1677FF]'}`}>
                           {selectedAnnouncement.isSticky ? '置顶' : '通知'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{selectedAnnouncement.date}</span>
                     </div>
                     <h3 className="text-lg font-extrabold text-slate-900 leading-snug">{selectedAnnouncement.title}</h3>
                  </div>
                  <button onClick={() => setSelectedAnnouncement(null)} className="text-slate-400 hover:text-slate-600 p-1.5 bg-white rounded-full hover:shadow-sm border border-[#E5EEF8] transition-colors"><X size={16} /></button>
               </div>
               
               <div className="p-6 overflow-y-auto custom-scrollbar">
                  <div className="prose prose-sm prose-slate max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed text-xs md:text-sm">
                     {selectedAnnouncement.content}
                  </div>
                  <div className="mt-8 pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400 font-medium">
                     <span className="flex items-center gap-1"><Shield size={12} className="text-slate-300" /> 发布授权: {selectedAnnouncement.authorName}</span>
                     <span>STAFF SYSTEM HR Corporate</span>
                  </div>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

// Simple internal icon component since lucide-react name is different or missing
const BarchartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export default Dashboard;
