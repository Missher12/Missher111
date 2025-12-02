
import React from 'react';
import { 
  Users, 
  Clock, 
  CalendarCheck, 
  TrendingUp,
  AlertTriangle,
  Megaphone,
  Bell,
  Phone,
  Shield,
  Pin
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AttendanceRecord, QueueTicket, Announcement } from '../types';

interface DashboardProps {
  attendanceRecords: AttendanceRecord[];
  queueData: QueueTicket[];
  announcements: Announcement[];
  isAdmin: boolean;
  groupInfo?: {
    groupName: string;
    leaderName: string;
    leaderPhone: string;
  } | null;
}

const Dashboard: React.FC<DashboardProps> = ({ attendanceRecords, queueData, announcements, isAdmin, groupInfo }) => {
  
  // Chinese Chart Data (Mock)
  const chartData = [
    { name: '周一', hours: 7.5 },
    { name: '周二', hours: 8.2 },
    { name: '周三', hours: 7.8 },
    { name: '周四', hours: 8.5 },
    { name: '周五', hours: 6.0 }, 
    { name: '周六', hours: 0 },
    { name: '周日', hours: 0 },
  ];

  const lastClockIn = attendanceRecords.filter(r => r.type === 'IN').pop();
  
  // Recruitment Stats
  const waitingCount = queueData.filter(t => t.status === 'WAITING').length;
  const interviewingCount = queueData.filter(t => t.status === 'CALLED').length;
  const completedToday = queueData.filter(t => t.status === 'COMPLETED').length;

  // Sort announcements: Sticky first, then by date
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.isSticky && !b.isSticky) return -1;
    if (!a.isSticky && b.isSticky) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-800">工作台概览</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Recruitment Monitor - Only for Admin */}
        {isAdmin && (
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
             <div className="flex justify-between items-start mb-4">
               <div>
                 <p className="text-indigo-100 text-sm font-medium">实时招聘监控</p>
                 <h3 className="text-2xl font-bold mt-1">{waitingCount} <span className="text-sm font-normal opacity-80">排队中</span></h3>
               </div>
               <div className="p-2 bg-white/10 rounded-lg"><Users size={20} /></div>
             </div>
             <div className="flex gap-4 text-xs text-indigo-100 border-t border-white/10 pt-3">
                <span>面试中: {interviewingCount}</span>
                <span>今日完成: {completedToday}</span>
             </div>
          </div>
        )}

        {/* Team Info Card - For Staff (or Admin if they belong to a group) */}
        {!isAdmin && groupInfo && (
           <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-6 rounded-xl shadow-lg text-white">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-blue-100 text-sm font-medium">我的所属团队</p>
                  <h3 className="text-xl font-bold mt-1">{groupInfo.groupName}</h3>
                </div>
                <div className="p-2 bg-white/10 rounded-lg"><Shield size={20} /></div>
              </div>
              <div className="border-t border-white/10 pt-3">
                 <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-blue-100">组长:</span>
                    <span className="font-medium text-sm">{groupInfo.leaderName}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Phone size={12} className="text-blue-200" />
                    <span className="text-xs text-white">{groupInfo.leaderPhone}</span>
                 </div>
              </div>
           </div>
        )}

        {/* Common Stats */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">今日打卡</p>
            <p className="text-lg font-bold text-gray-800">
              {lastClockIn ? new Date(lastClockIn.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '未打卡'}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">考勤异常</p>
            <p className="text-lg font-bold text-gray-800">0</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
           {/* Chart */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                 <TrendingUp size={20} className="text-gray-500" />
                 个人工时趋势
               </h2>
             </div>
             <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                   <defs>
                     <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                   <Tooltip 
                     formatter={(value: number) => [`${value} 小时`, '工时']}
                     contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                   />
                   <Area type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
           </div>

           {/* Announcements */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Megaphone size={20} className="text-indigo-500" /> 企业公告
              </h2>
              <div className="space-y-3">
                 {sortedAnnouncements.map(notice => (
                   <div 
                     key={notice.id} 
                     className={`flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border-l-4 ${
                       notice.isSticky ? 'border-orange-500 bg-orange-50/20' : 'border-indigo-500 bg-indigo-50/10'
                     }`}
                   >
                      <div className="mt-0.5">
                        {notice.isSticky ? <Pin size={16} className="text-orange-500 fill-current" /> : <Bell size={16} className="text-gray-400" />}
                      </div>
                      <div className="flex-1">
                         <div className="flex justify-between items-start">
                            <h4 className="font-medium text-gray-800 text-sm flex items-center gap-2">
                              {notice.title}
                              {notice.targetGroupId && (
                                <span className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded border border-blue-100">
                                  组内通知
                                </span>
                              )}
                            </h4>
                            <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-100">{notice.date}</span>
                         </div>
                         <p className="text-sm text-gray-500 mt-1 line-clamp-2">{notice.content}</p>
                         <div className="mt-1 text-xs text-gray-400">
                           发布人: {notice.authorName}
                         </div>
                      </div>
                   </div>
                 ))}
                 {sortedAnnouncements.length === 0 && <p className="text-gray-400 text-sm text-center py-4">暂无公告</p>}
              </div>
           </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">最近打卡记录</h2>
            <div className="space-y-4">
              {attendanceRecords.length === 0 && (
                <p className="text-sm text-gray-500 italic">暂无打卡记录。</p>
              )}
              {attendanceRecords.slice().reverse().slice(0, 6).map((record) => (
                <div key={record.id} className="flex items-start space-x-3 pb-3 border-b border-gray-50 last:border-0">
                  <div className={`mt-1 w-2 h-2 rounded-full ${record.type === 'IN' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {record.type === 'IN' ? '上班打卡' : '下班打卡'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(record.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;