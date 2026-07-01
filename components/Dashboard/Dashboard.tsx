import React, { useMemo, useState } from 'react';
import { 
  Users, 
  Clock, 
  Megaphone, 
  CheckCircle2, 
  CalendarDays, 
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
  FileSpreadsheet,
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AttendanceRecord, QueueTicket, Announcement, Staff, Group } from '../../types';
import { getLocalDateKey } from '../../utils';
import { SurfaceCard, MetricCard, Button, StatusBadge } from '../ui/Kit';

interface DashboardProps {
  attendanceRecords: AttendanceRecord[];
  queueData: QueueTicket[];
  announcements: Announcement[];
  isAdmin: boolean;
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
  groups
}) => {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  
  // 1. Calculate Stats
  const globalStats = useMemo(() => {
    const todayKey = getLocalDateKey();
    const todayRecords = attendanceRecords.filter(r => getLocalDateKey(r.timestamp) === todayKey && r.type === 'IN');
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
  }, [attendanceRecords, staffList]);

  // 2. Recharts Check-in Trend
  const trendData = useMemo(() => {
    const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00', '18:00'];
    const todayKey = getLocalDateKey();
    
    return hours.map(h => {
      const targetHour = parseInt(h.split(':')[0]);
      const count = attendanceRecords.filter(r => {
        const d = new Date(r.timestamp);
        return getLocalDateKey(r.timestamp) === todayKey && d.getHours() <= targetHour && r.type === 'IN';
      }).length;
      return { time: h, '签到人数': count };
    });
  }, [attendanceRecords]);

  // 3. Calculate Group Stats
  const todayKey = getLocalDateKey();
  const groupStats = useMemo(() => {
    return groups.map(group => {
      const groupStaff = staffList.filter(s => s.status === 'ACTIVE' && s.roles.some(r => r.groupId === group.id));
      const total = groupStaff.length;

      const presentCount = groupStaff.filter(s => {
         return attendanceRecords.some(r => 
            r.staffId === s.id && 
            r.type === 'IN' && 
            getLocalDateKey(r.timestamp) === todayKey
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
  }, [groups, staffList, attendanceRecords, todayKey]);

  // Sort announcements (sticky first)
  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => {
      if (a.isSticky && !b.isSticky) return -1;
      if (!a.isSticky && b.isSticky) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [announcements]);

  // Latest 5 Sign-Ins
  const latestSignIns = useMemo(() => {
    const todayKey = getLocalDateKey();
    return attendanceRecords
      .filter(r => getLocalDateKey(r.timestamp) === todayKey)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
      .map(rec => {
        const staff = staffList.find(s => s.id === rec.staffId);
        return {
          ...rec,
          staffName: staff ? staff.name : '未知人员',
          groupName: staff && staff.roles.length > 0 ? staff.roles[0].groupName : '待分配'
        };
      });
  }, [attendanceRecords, staffList]);

  // Pending Actions
  const pendingActions = useMemo(() => {
    const pendingAlloc = staffList.filter(s => s.roles.some(r => r.groupId === 'g_pending_allocation')).length;
    const waitingQueue = queueData.filter(t => t.status === 'WAITING').length;
    
    const items = [];
    if (pendingAlloc > 0) {
      items.push({
        id: 'alloc',
        title: '待分配战队人员',
        desc: `目前有 ${pendingAlloc} 名入职人员留在中转组，需尽快划分编组。`,
        count: pendingAlloc,
        type: 'warning' as const
      });
    }
    if (waitingQueue > 0) {
      items.push({
        id: 'queue',
        title: '现场队列等待中',
        desc: `有 ${waitingQueue} 名人员在签到核销队列中等待叫号处理。`,
        count: waitingQueue,
        type: 'info' as const
      });
    }
    return items;
  }, [staffList, queueData]);

  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour < 5) return '夜深了，注意休息';
    if (hour < 9) return '早上好，新的一天现场工作加油';
    if (hour < 12) return '上午好，现场运转正常，保持关注';
    if (hour < 14) return '中午好，适当午休，下午继续冲刺';
    if (hour < 18) return '下午好，今日签到状态稳定';
    return '晚上好，感谢今日的现场坚守与指挥';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* =======================================================
          第一行：欢迎区 + 当前活动状态 + 一个明确主操作
          ======================================================= */}
      <div className="bg-white rounded-[18px] p-6 border border-[#E5EEF8] shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-[#EAF4FF] text-[#1677FF] px-3 py-1 rounded-[10px] text-xs font-bold flex items-center gap-1.5">
              <CalendarDays size={13} />
              {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="bg-emerald-50 text-[#22A06B] border border-emerald-100 px-3 py-1 rounded-[10px] text-xs font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              系统已连接 · 运转良好
            </span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#102A43] tracking-tight">
              {getGreetingText()}
            </h1>
            <p className="text-xs text-[#7B93AA] mt-1 leading-relaxed">
              您好，系统管理员。当前活动现场调度系统正在实时同步报名核销、团队排班和打卡数据。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden xl:block mr-2">
            <p className="text-xs font-semibold text-[#102A43]">系统管理员</p>
            <p className="text-[11px] text-[#7B93AA] mt-0.5">控制台主指挥官</p>
          </div>
          <div className="p-2.5 bg-[#F8FBFF] text-[#1677FF] rounded-[12px] border border-[#E5EEF8]">
            <Shield size={20} />
          </div>
        </div>
      </div>

      {/* =======================================================
          第二行：四个统一尺寸的数据指标卡
          ======================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="花名册在职人数"
          value={staffList.length}
          description="当前在册活跃状态工作人员"
          icon={<Users size={20} />}
        />
        <MetricCard
          title="今日签到人数"
          value={globalStats.present}
          description={`今日应到 ${globalStats.total} 人`}
          icon={<UserCheck size={20} />}
          trend={{ value: `${globalStats.present} / ${globalStats.total}`, isUp: true }}
        />
        <MetricCard
          title="今日出勤率"
          value={`${globalStats.rate}%`}
          description={`今日异常迟到 ${globalStats.late} 人`}
          icon={<TrendingUp size={20} />}
          trend={{ value: globalStats.rate >= 90 ? '出勤优异' : '出勤一般', isUp: globalStats.rate >= 80 }}
        />
        <MetricCard
          title="现场待核销"
          value={queueData.filter(t => t.status === 'WAITING').length}
          description="排队队列中等待核销的人员"
          icon={<Clock size={20} />}
        />
      </div>

      {/* =======================================================
          第三行：签到趋势图 + 分组出勤情况
          ======================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Realtime Graph */}
        <SurfaceCard className="p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#102A43] flex items-center gap-2">
                <BarChart3 size={16} className="text-[#1677FF]" />
                今日签到时间走势图
              </h3>
              <p className="text-xs text-[#7B93AA] mt-0.5">实时计算各个时间段累计签到的工作人员数量</p>
            </div>
            <StatusBadge type="info">当日统计</StatusBadge>
          </div>
          <div className="h-[220px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSign" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1677FF" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#1677FF" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EEF8" />
                <XAxis dataKey="time" stroke="#7B93AA" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#7B93AA" fontSize={11} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={{ background: '#102A43', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '12px' }} />
                <Area type="monotone" dataKey="签到人数" stroke="#1677FF" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSign)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>

        {/* Group的出勤情况 */}
        <SurfaceCard className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
            <h3 className="text-sm font-bold text-[#102A43] flex items-center gap-2">
              <PieChart size={16} className="text-[#1677FF]" />
              团队分组出勤
            </h3>
            <span className="text-[11px] text-[#7B93AA] font-bold">已激活 {groupStats.length} 个编组</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 max-h-[230px] pr-1">
            {groupStats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 text-[#7B93AA]">
                <p className="text-xs">暂无组织架构数据</p>
              </div>
            ) : (
              groupStats.map((group) => (
                <div key={group.id} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[#102A43] truncate max-w-[140px]" title={group.name}>
                      {group.name}
                    </span>
                    <span className={`font-bold px-1.5 py-0.5 rounded-[6px] text-[10px] ${
                      group.rate >= 90 ? 'bg-emerald-50 text-[#22A06B]' : 
                      group.rate >= 70 ? 'bg-amber-50 text-[#F59E0B]' : 'bg-rose-50 text-[#E5484D]'
                    }`}>
                      {group.rate}% 出勤
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-[#F8FBFF] border border-[#E5EEF8] h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        group.rate >= 90 ? 'bg-[#22A06B]' : 
                        group.rate >= 70 ? 'bg-[#F59E0B]' : 'bg-[#E5484D]'
                      }`} 
                      style={{ width: `${group.rate}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#7B93AA]">
                    <span>在册: {group.total} 人</span>
                    <span>已到: {group.present} / 未到: {Math.max(0, group.total - group.present)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>
      </div>

      {/* =======================================================
          第四行：待处理事项 + 最新签到 + 最新公告
          ======================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 待处理事项 */}
        <SurfaceCard className="p-6 flex flex-col min-h-[320px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
            <h3 className="text-sm font-bold text-[#102A43] flex items-center gap-2">
              <AlertCircle size={16} className="text-[#F59E0B]" />
              待处理事项
            </h3>
            {pendingActions.length > 0 && (
              <span className="text-[10px] bg-amber-50 text-[#F59E0B] px-2 py-0.5 rounded-full font-bold">
                {pendingActions.length} 项需跟进
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {pendingActions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-[#7B93AA]">
                <CheckCircle2 size={32} className="text-[#22A06B] opacity-60 mb-2" />
                <p className="text-xs font-semibold text-[#102A43]">所有任务运行顺畅</p>
                <p className="text-[11px] text-[#7B93AA] mt-1">目前暂无急需处理的待分配项</p>
              </div>
            ) : (
              pendingActions.map(act => (
                <div key={act.id} className="p-3.5 rounded-[12px] bg-slate-50/50 border border-[#E5EEF8] flex items-start gap-3 hover:border-amber-200 hover:bg-amber-50/10 transition-colors">
                  <div className={`p-1.5 rounded-lg ${act.type === 'warning' ? 'bg-amber-50 text-[#F59E0B]' : 'bg-blue-50 text-[#1677FF]'}`}>
                    <AlertCircle size={14} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-[#102A43]">{act.title}</h4>
                    <p className="text-[11px] text-[#486581] leading-relaxed">{act.desc}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>

        {/* 最新签到 */}
        <SurfaceCard className="p-6 flex flex-col min-h-[320px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
            <h3 className="text-sm font-bold text-[#102A43] flex items-center gap-2">
              <Activity size={16} className="text-[#1677FF]" />
              最新签到记录
            </h3>
            <span className="text-[10px] text-[#7B93AA]">今日实况</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {latestSignIns.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-[#7B93AA]">
                <Clock size={28} className="opacity-20 mb-2" />
                <p className="text-xs">今天暂无打卡数据</p>
              </div>
            ) : (
              latestSignIns.map(rec => (
                <div key={rec.id} className="flex justify-between items-center p-2.5 rounded-[10px] hover:bg-[#F8FBFF] transition-colors border border-transparent hover:border-[#E5EEF8]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#EAF4FF] text-[#1677FF] flex items-center justify-center text-xs font-bold font-sans">
                      {rec.staffName.slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#102A43]">{rec.staffName}</h4>
                      <p className="text-[10px] text-[#7B93AA] mt-0.5">{rec.groupName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-[#102A43] tabular-nums">
                      {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <p className="text-[10px] mt-0.5">
                      {rec.status === 'LATE' ? (
                        <span className="text-[#F59E0B]">迟到打卡</span>
                      ) : (
                        <span className="text-[#22A06B]">正常上班</span>
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>

        {/* 最新公告 */}
        <SurfaceCard className="p-6 flex flex-col min-h-[320px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
            <h3 className="text-sm font-bold text-[#102A43] flex items-center gap-2">
              <Bell size={16} className="text-amber-500" />
              最新公告通知
            </h3>
            {sortedAnnouncements.length > 0 && (
              <span className="text-[10px] bg-blue-50 text-[#1677FF] px-2 py-0.5 rounded-full font-bold">
                {sortedAnnouncements.length} 篇
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1 max-h-[230px]">
            {sortedAnnouncements.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-[#7B93AA]">
                <Megaphone size={28} className="opacity-20 mb-2" />
                <p className="text-xs">暂无发布的公告</p>
              </div>
            ) : (
              sortedAnnouncements.slice(0, 4).map(ann => (
                <div 
                  key={ann.id}
                  onClick={() => setSelectedAnnouncement(ann)}
                  className="p-3 rounded-[12px] bg-[#F8FBFF] border border-[#E5EEF8]/60 hover:border-[#1677FF]/40 hover:bg-white transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] ${ann.isSticky ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-[#1677FF]'}`}>
                      {ann.isSticky ? '置顶' : '常规'}
                    </span>
                    <span className="text-[10px] text-[#7B93AA] font-mono">{ann.date}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs line-clamp-1 group-hover:text-[#1677FF] transition-colors">
                    {ann.title}
                  </h4>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>

      </div>

      {/* Announcement Details Modal */}
      {selectedAnnouncement && (
         <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedAnnouncement(null)}>
            <div className="bg-white rounded-[18px] shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] border border-[#E5EEF8]" onClick={(e) => e.stopPropagation()}>
               <div className="p-5 border-b border-slate-50 flex justify-between items-start bg-slate-50/30">
                  <div className="pr-4">
                     <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${selectedAnnouncement.isSticky ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 text-[#1677FF]'}`}>
                           {selectedAnnouncement.isSticky ? '置顶' : '通知'}
                        </span>
                        <span className="text-xs text-[#7B93AA] font-mono">{selectedAnnouncement.date}</span>
                     </div>
                     <h3 className="text-sm font-bold text-[#102A43] leading-snug">{selectedAnnouncement.title}</h3>
                  </div>
                  <button onClick={() => setSelectedAnnouncement(null)} className="text-slate-400 hover:text-slate-600 p-1.5 bg-white rounded-full hover:shadow-sm border border-[#E5EEF8] transition-colors"><X size={14} /></button>
               </div>
               
               <div className="p-5 overflow-y-auto custom-scrollbar">
                  <div className="text-[#486581] whitespace-pre-wrap leading-relaxed text-xs">
                     {selectedAnnouncement.content}
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-[#7B93AA] font-medium">
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

export default Dashboard;
