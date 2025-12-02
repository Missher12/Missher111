
import React, { useState } from 'react';
import { Staff, AttendanceRecord } from '../types';
import { 
  BarChart3, 
  CalendarDays, 
  MapPin, 
  Clock, 
  ChevronRight,
  Filter,
  X,
  AlertCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface AttendanceReportsProps {
  staffList: Staff[];
  allRecords: AttendanceRecord[];
  fixedGroupId?: string; // If provided, locks the dropdown to this group
}

const AttendanceReports: React.FC<AttendanceReportsProps> = ({ staffList, allRecords, fixedGroupId }) => {
  const [selectedGroup, setSelectedGroup] = useState<string>(fixedGroupId || 'ALL');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  // Get active staff only for reports
  const activeStaff = staffList.filter(s => s.status === 'ACTIVE');

  // Filter staff by group
  const displayedStaff = selectedGroup === 'ALL' 
    ? activeStaff 
    : activeStaff.filter(s => s.roles.some(r => r.groupId === selectedGroup));

  // Get available groups from staff data
  const groups = Array.from(new Set(activeStaff.flatMap(s => s.roles.map(r => JSON.stringify({id: r.groupId, name: r.groupName})))))
    .map((str) => JSON.parse(str as string));

  // If fixedGroupId is present, filter groups list to only show that one (optional, or just disable select)
  const visibleGroups = fixedGroupId ? groups.filter((g: any) => g.id === fixedGroupId) : groups;

  // Helper to get today's record
  const getTodayRecord = (staffId: string) => {
    const todayStr = new Date().toDateString();
    return allRecords.find(r => 
      r.staffId === staffId && 
      r.type === 'IN' && 
      new Date(r.timestamp).toDateString() === todayStr
    );
  };

  // Generate 7 day history for a staff
  const getStaffHistory = (staffId: string) => {
    const history = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toDateString();
      
      const record = allRecords.find(r => 
        r.staffId === staffId && 
        r.type === 'IN' && 
        new Date(r.timestamp).toDateString() === dateStr
      );

      history.push({
        date: date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
        fullDate: date,
        clockInTime: record ? new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : null,
        status: record ? record.status : 'ABSENT', // 'ABSENT' for simplicity in demo
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      });
    }
    return history;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          {fixedGroupId ? '小组考勤报表' : '团队考勤报表'}
        </h1>
        
        {/* Group Filter */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
          <Filter size={16} className="text-gray-500" />
          <select 
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            disabled={!!fixedGroupId}
            className={`bg-transparent text-sm text-gray-700 outline-none pr-4 ${fixedGroupId ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
          >
            {!fixedGroupId && <option value="ALL">所有部门/分组</option>}
            {visibleGroups.map((g: any) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg shadow-blue-200">
          <p className="text-blue-100 text-sm font-medium mb-1">今日出勤率</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-bold">
              {Math.round((displayedStaff.filter(s => getTodayRecord(s.id)).length / (displayedStaff.length || 1)) * 100)}%
            </h2>
            <span className="text-sm opacity-80">实到 / 应到 {displayedStaff.length}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
           <p className="text-gray-500 text-sm font-medium mb-1">迟到/早退</p>
           <h2 className="text-3xl font-bold text-orange-500">
             {displayedStaff.filter(s => getTodayRecord(s.id)?.status !== 'NORMAL' && getTodayRecord(s.id)).length}
             <span className="text-sm text-gray-400 font-normal ml-2">人次</span>
           </h2>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
           <p className="text-gray-500 text-sm font-medium mb-1">缺勤人数</p>
           <h2 className="text-3xl font-bold text-gray-800">
             {displayedStaff.length - displayedStaff.filter(s => getTodayRecord(s.id)).length}
             <span className="text-sm text-gray-400 font-normal ml-2">人</span>
           </h2>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {displayedStaff.length === 0 && <div className="col-span-full text-center text-gray-400 py-10">该组暂无成员</div>}
        {displayedStaff.map(staff => {
          const todayRecord = getTodayRecord(staff.id);
          const isLeader = staff.roles.some(r => r.isLeader && (selectedGroup === 'ALL' || r.groupId === selectedGroup));
          
          return (
            <div 
              key={staff.id}
              onClick={() => setSelectedStaff(staff)}
              className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group relative"
            >
              {isLeader && (
                <div className="absolute top-3 right-3 text-purple-600 bg-purple-50 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-100">
                  组长
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-3">
                <img src={staff.avatar} alt={staff.name} className="w-12 h-12 rounded-full bg-gray-100" />
                <div>
                  <h3 className="font-bold text-gray-800">{staff.name}</h3>
                  <p className="text-xs text-gray-500 truncate max-w-[120px]">
                    {staff.roles.map(r => r.groupName).join(', ') || '未分组'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm mt-2 pt-3 border-t border-gray-50">
                <span className="text-gray-500">今日状态</span>
                {todayRecord ? (
                  <span className={`flex items-center gap-1 font-medium ${
                    todayRecord.status === 'NORMAL' ? 'text-green-600' : 'text-orange-500'
                  }`}>
                    <Clock size={14} />
                    {new Date(todayRecord.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    {todayRecord.status !== 'NORMAL' && <AlertCircle size={14} />}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">未打卡</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img src={selectedStaff.avatar} className="w-10 h-10 rounded-full" alt="" />
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{selectedStaff.name} 的考勤记录</h3>
                  <p className="text-xs text-gray-500">最近 7 天数据概览</p>
                </div>
              </div>
              <button onClick={() => setSelectedStaff(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Chart */}
              <div className="h-48 w-full mb-6 bg-blue-50/50 rounded-xl p-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getStaffHistory(selectedStaff.id).map(d => ({
                        name: d.date,
                        statusVal: d.clockInTime ? 1 : 0
                    }))}>
                      <defs>
                        <linearGradient id="colorStatus" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <Tooltip labelStyle={{color:'#333'}} contentStyle={{borderRadius: '8px'}} />
                      <Area type="step" dataKey="statusVal" stroke="#3b82f6" fillOpacity={1} fill="url(#colorStatus)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>

              {/* List */}
              <div className="space-y-3">
                {getStaffHistory(selectedStaff.id).map((day, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${day.clockInTime ? 'bg-green-500' : (day.isWeekend ? 'bg-gray-300' : 'bg-red-400')}`} />
                      <span className="text-sm text-gray-600 font-medium w-24">{day.date}</span>
                      <span className="text-xs text-gray-400">{day.fullDate.toLocaleDateString('zh-CN', {weekday: 'long'})}</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                       {day.clockInTime ? (
                         <div className="flex items-center gap-2 text-sm text-gray-800">
                           <Clock size={14} className="text-gray-400" />
                           {day.clockInTime}
                           {day.status !== 'NORMAL' && (
                             <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">异常</span>
                           )}
                         </div>
                       ) : (
                         <span className="text-xs text-gray-400 italic">
                           {day.isWeekend ? '周末休息' : '缺勤'}
                         </span>
                       )}
                       {day.clockInTime && <MapPin size={14} className="text-gray-300" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReports;
