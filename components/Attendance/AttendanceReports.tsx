
import React, { useState, useMemo, useEffect } from 'react';
import { Staff, AttendanceRecord, Group, UserSession, PermissionSettings, AttendanceConfig } from '../../types';
import { 
  BarChart3, 
  Clock, 
  Filter,
  X,
  AlertCircle,
  TrendingUp,
  Image as ImageIcon,
  Users,
  LayoutGrid,
  List,
  Download,
  ChevronLeft,
  ChevronRight,
  Phone,
  Calendar,
  ZoomIn,
  ArrowRight,
  ArrowLeft,
  Edit2,
  Save,
  UserCheck,
  UserX
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { maskPhone, maskIdCard, isSameDay } from '../../utils';

interface AttendanceReportsProps {
  staffList: Staff[];
  groups: Group[];
  allRecords: AttendanceRecord[];
  session: UserSession | null;
  permissionSettings: PermissionSettings;
  attendanceConfig: AttendanceConfig;
  onUpdateOrAddRecord: (staffId: string, dateStr: string, type: 'IN' | 'OUT', timeStr: string) => void;
  fixedGroupId?: string;
}

const AttendanceReports: React.FC<AttendanceReportsProps> = ({ 
  staffList, 
  groups, 
  allRecords, 
  session, 
  permissionSettings, 
  attendanceConfig,
  onUpdateOrAddRecord,
  fixedGroupId 
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  
  const visibleGroups = groups;
  
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    fixedGroupId || (visibleGroups.length > 0 ? visibleGroups[0].id : 'ALL')
  );
  
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editInTime, setEditInTime] = useState('');
  const [editOutTime, setEditOutTime] = useState('');

  const getRecordForDate = (staffId: string, dateStr: string, type: 'IN' | 'OUT') => {
    const recordsOnDate = allRecords.filter(r => r.staffId === staffId && isSameDay(r.timestamp, dateStr) && r.type === type);
    // Return earliest for IN, latest for OUT
    if (type === 'IN') {
        return recordsOnDate.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
    }
    return recordsOnDate.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
};

  const activeStaff = useMemo(() => staffList.filter(s => s.status === 'ACTIVE'), [staffList]);
  
  const displayedStaff = useMemo(() => {
    let filtered = activeStaff;
    if (selectedGroupId !== 'ALL') {
      if (selectedGroupId === 'g_pending_allocation') {
         filtered = filtered.filter(s => 
            s.roles.some(r => r.groupId === selectedGroupId) || s.roles.length === 0
         );
      } else {
         filtered = filtered.filter(s => s.roles.some(r => r.groupId === selectedGroupId));
      }
    } else {
      if (visibleGroups.length < groups.length) {
         const visibleGroupIds = new Set(visibleGroups.map(g => g.id));
         filtered = filtered.filter(s => s.roles.some(r => visibleGroupIds.has(r.groupId)));
      }
    }
    return filtered;
  }, [activeStaff, selectedGroupId, visibleGroups, groups]);

  const dailyStats = useMemo(() => {
    let present = 0, late = 0, abnormal = 0;
    displayedStaff.forEach(staff => {
      const record = getRecordForDate(staff.id, selectedDate, 'IN');
      if (record) {
        present++;
        if (record.status === 'LATE') late++;
        if (record.status !== 'NORMAL') abnormal++;
      }
    });
    return {
      total: displayedStaff.length,
      present,
      absent: displayedStaff.length - present,
      late,
      abnormal,
      rate: displayedStaff.length > 0 ? Math.round((present / displayedStaff.length) * 100) : 0
    };
  }, [displayedStaff, selectedDate, allRecords]);

  const trendData = useMemo(() => {
    const data = [];
    const end = new Date(selectedDate);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
      let pCount = 0, lCount = 0;
      displayedStaff.forEach(staff => {
        const record = getRecordForDate(staff.id, dateStr, 'IN');
        if (record) {
          pCount++;
          if (record.status === 'LATE') lCount++;
        }
      });
      data.push({ name: label, date: dateStr, present: pCount, late: lCount, absent: displayedStaff.length - pCount });
    }
    return data;
  }, [selectedDate, displayedStaff, allRecords]);

  const { inRecord, outRecord } = useMemo(() => {
    if (!selectedStaff) return { inRecord: null, outRecord: null };
    const inRec = getRecordForDate(selectedStaff.id, selectedDate, 'IN');
    const outRec = getRecordForDate(selectedStaff.id, selectedDate, 'OUT');
    return { inRecord: inRec || null, outRecord: outRec || null };
  }, [selectedStaff, selectedDate, allRecords]);
  
  const originalInTime = useMemo(() => inRecord ? new Date(inRecord.timestamp).toTimeString().slice(0, 5) : '', [inRecord]);
  const originalOutTime = useMemo(() => outRecord ? new Date(outRecord.timestamp).toTimeString().slice(0, 5) : '', [outRecord]);

  useEffect(() => {
    if (selectedStaff) {
      setEditInTime(originalInTime);
      setEditOutTime(originalOutTime);
      setIsEditing(false); // Reset on new staff selection
    }
  }, [selectedStaff, originalInTime, originalOutTime]);

  const handleSaveEdits = () => {
    if (!selectedStaff) return;
    if (editInTime !== originalInTime) {
      onUpdateOrAddRecord(selectedStaff.id, selectedDate, 'IN', editInTime);
    }
    if (editOutTime !== originalOutTime) {
      onUpdateOrAddRecord(selectedStaff.id, selectedDate, 'OUT', editOutTime);
    }
    setIsEditing(false);
  };

  const handleExport = () => {
    const headers = ['工号/ID', '姓名', '手机号', '职位/角色', '日期', '上班时间', '上班状态', '下班时间', '下班状态', '加班时长'];
    const csvRows = displayedStaff.map(staff => {
      const recordIn = getRecordForDate(staff.id, selectedDate, 'IN');
      const recordOut = getRecordForDate(staff.id, selectedDate, 'OUT');
      const rolesStr = staff.roles.map(r => `${r.groupName}${r.isLeader ? '组长' : '组员'}`).join('; ');
      
      const shouldShow = session?.role === 'ADMIN' || permissionSettings.showSensitiveInfo;

      const timeInStr = recordIn ? new Date(recordIn.timestamp).toLocaleTimeString() : '-';
      const statusInStr = recordIn ? (recordIn.status === 'NORMAL' ? '正常' : '迟到/异常') : '缺勤';
      
      const timeOutStr = recordOut ? new Date(recordOut.timestamp).toLocaleTimeString() : '-';
      const statusOutStr = recordOut ? (recordOut.status === 'NORMAL' ? '正常' : '早退/异常') : '-';

      // Overtime Calculation
      let overtimeDuration = '-';
      if (recordOut && attendanceConfig.overtimeStart) {
         const outDate = new Date(recordOut.timestamp);
         // Construct Overtime Threshold Date for the same day
         const [oh, om] = attendanceConfig.overtimeStart.split(':').map(Number);
         const thresholdDate = new Date(outDate);
         thresholdDate.setHours(oh, om, 0, 0);

         if (outDate > thresholdDate) {
            const diffMs = outDate.getTime() - thresholdDate.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            overtimeDuration = `${diffHours}小时${diffMinutes}分`;
         }
      }

      const phoneStr = shouldShow ? staff.phone : maskPhone(staff.phone);
      const idStr = shouldShow ? (staff.idCard || staff.id) : maskIdCard(staff.idCard || staff.id);

      return [
        idStr,
        staff.name,
        phoneStr,
        rolesStr,
        selectedDate,
        timeInStr,
        statusInStr,
        timeOutStr,
        statusOutStr,
        overtimeDuration
      ].map(cell => `"${cell}"`).join(',');
    });

    const csvContent = "\ufeff" + [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `考勤报表_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const getRoleText = (staff: Staff) => {
    if (staff.roles.length === 0) return '待分配成员';
    if (selectedGroupId !== 'ALL') {
      const role = staff.roles.find(r => r.groupId === selectedGroupId);
      return role ? `${role.groupName} ${role.isLeader ? '组长' : '组员'}` : '成员';
    }
    const r = staff.roles[0];
    return r ? `${r.groupName} ${r.isLeader ? '组长' : '组员'}` : '成员';
  };

  const renderRecordBlock = (record: AttendanceRecord | null, type: 'IN' | 'OUT') => {
    const title = type === 'IN' ? '上班打卡' : '下班打卡';
    const icon = type === 'IN' ? <ArrowRight size={16} /> : <ArrowLeft size={16} />;
    
    return (
      <div className="bg-gray-50 p-4 rounded-xl border border-[#E5EEF8]">
        <p className={`text-xs font-bold uppercase mb-2 flex items-center gap-1 ${type === 'IN' ? 'text-green-600' : 'text-orange-600'}`}>
          {icon} {title}
        </p>
        {record ? (
          <div className="flex items-start gap-3">
            {record.isManual ? (
                <div className="w-20 h-20 rounded-lg bg-gray-200 flex flex-col items-center justify-center text-gray-500 text-xs font-bold text-center p-1 leading-tight">
                  手动<br/>补卡
                </div>
            ) : record.photoUrl ? (
              <div 
                className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setPreviewPhoto(record.photoUrl || null)}
              >
                <img src={record.photoUrl} className="w-full h-full object-cover" alt={`${title} photo`} />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                无照片
              </div>
            )}
            <div>
              <p className="text-2xl font-mono font-bold text-gray-800">
                {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
              <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-bold ${record.status === 'NORMAL' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {record.status === 'NORMAL' ? '正常' : record.status === 'LATE' ? '迟到' : record.status === 'EARLY_LEAVE' ? '早退' : '异常'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 italic text-sm py-2">本日暂无{title}记录</p>
        )}
      </div>
    );
  };

  const canExport = session?.role === 'ADMIN' || permissionSettings.allowLeaderExport;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* 1. Header Toolbar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5EEF8]/80 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20 hover:shadow-md transition-all duration-300">
         <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="p-2.5 bg-blue-50 rounded-xl text-[#1677FF]">
               <BarChart3 size={20} />
            </div>
            <div>
               <h1 className="font-extrabold text-[#0c2f42] text-lg">考勤报表</h1>
               <p className="text-xs text-slate-400 hidden sm:block">查看每日出勤与异常记录</p>
            </div>
         </div>

         {/* Filters & Controls */}
         <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            
            <div className="relative">
               <select 
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2.5 pl-3.5 pr-8 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-100 cursor-pointer min-w-[140px]"
               >
                  {!fixedGroupId && <option value="ALL">所有业务组</option>}
                  {visibleGroups.map(g => (
                     <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
               </select>
               <Filter size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
               <button onClick={() => shiftDate(-1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all"><ChevronLeft size={16} /></button>
               <input 
                 type="date" 
                 value={selectedDate}
                 onChange={(e) => setSelectedDate(e.target.value)}
                 className="bg-transparent border-none text-sm font-extrabold text-slate-700 focus:ring-0 px-2 w-[110px] text-center outline-none"
               />
               <button onClick={() => shiftDate(1)} disabled={selectedDate >= todayStr} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>

            <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

            <div className="flex bg-slate-100/80 p-1 rounded-xl">
               <button 
                 onClick={() => setViewMode('GRID')}
                 className={`p-1.5 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-white text-[#1677FF] shadow-sm border border-slate-200/40' : 'text-slate-400 hover:text-slate-600'}`}
                 title="网格视图"
               >
                  <LayoutGrid size={16} />
               </button>
               <button 
                 onClick={() => setViewMode('TABLE')}
                 className={`p-1.5 rounded-lg transition-all ${viewMode === 'TABLE' ? 'bg-white text-[#1677FF] shadow-sm border border-slate-200/40' : 'text-slate-400 hover:text-slate-600'}`}
                 title="列表视图"
               >
                  <List size={16} />
               </button>
            </div>
            
            {canExport && (
              <button 
                 onClick={handleExport}
                 className="bg-[#1677FF] hover:bg-[#0B5FCC] text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm shadow-blue-100/20 transition-all"
              >
                 <Download size={16} /> <span className="hidden sm:inline">导出</span>
              </button>
            )}
         </div>
      </div>

      {/* 2. Stats Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5EEF8] flex flex-col justify-between h-28 relative overflow-hidden hover:shadow-md hover:border-blue-100/60 transition-all duration-300">
            <div className="flex justify-between items-start z-10">
               <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">出勤率</span>
               <div className={`p-1.5 rounded-full ${dailyStats.rate >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  <TrendingUp size={16} />
               </div>
            </div>
            <div className="z-10">
               <h3 className="text-3xl font-black text-slate-800">{dailyStats.rate}%</h3>
               <p className="text-xs text-slate-500 mt-1 font-semibold">实到 {dailyStats.present} / 应到 {dailyStats.total}</p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-4 translate-y-4 text-[#1677FF]">
               <BarChart3 size={80} />
            </div>
         </div>

         <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5EEF8] flex flex-col justify-between h-28 hover:shadow-md hover:border-blue-100/60 transition-all duration-300">
            <div className="flex justify-between items-start">
               <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">迟到人数</span>
               <div className="p-1.5 rounded-full bg-orange-50 text-orange-600"><Clock size={16} /></div>
            </div>
            <div>
               <h3 className="text-3xl font-black text-orange-500">{dailyStats.late}</h3>
               <p className="text-xs text-slate-500 mt-1 font-semibold">需关注考勤纪律</p>
            </div>
         </div>

         <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5EEF8] flex flex-col justify-between h-28 hover:shadow-md hover:border-blue-100/60 transition-all duration-300">
            <div className="flex justify-between items-start">
               <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">缺勤人数</span>
               <div className="p-1.5 rounded-full bg-rose-50 text-rose-600"><AlertCircle size={16} /></div>
            </div>
            <div>
               <h3 className="text-3xl font-black text-slate-800">{dailyStats.absent}</h3>
               <p className="text-xs text-slate-500 mt-1 font-semibold">未打卡人员</p>
            </div>
         </div>

         <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E5EEF8] h-28 hidden md:block hover:shadow-md hover:border-blue-100/60 transition-all duration-300">
            <p className="text-xs text-slate-400 font-bold mb-2">近7天趋势</p>
            <div className="h-16 w-full">
               <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={trendData}>
                     <defs>
                        <linearGradient id="colorPresentMini" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#1677FF" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#1677FF" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <Area type="monotone" dataKey="present" stroke="#1677FF" strokeWidth={2} fill="url(#colorPresentMini)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* ... Rest of the file unchanged ... */}
      <div>
         <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users size={20} className="text-[#1677FF]" /> 
            {selectedDate === todayStr ? '今日' : selectedDate} 考勤明细
         </h3>

         {viewMode === 'GRID' ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
               {displayedStaff.map(staff => {
                  const record = getRecordForDate(staff.id, selectedDate, 'IN');
                  const roleText = getRoleText(staff);
                  const isLeader = roleText.includes('组长');

                  return (
                     <div 
                        key={staff.id}
                        onClick={() => setSelectedStaff(staff)}
                        className={`bg-white p-5 rounded-xl border shadow-sm cursor-pointer hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between h-full ${
                           record 
                              ? (record.status === 'NORMAL' ? 'border-green-100 hover:border-green-200' : 'border-orange-100 hover:border-orange-200')
                              : 'border-[#E5EEF8] opacity-90'
                        }`}
                     >
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                           record 
                              ? (record.status === 'NORMAL' ? 'bg-green-500' : 'bg-orange-500')
                              : 'bg-gray-200'
                        }`}></div>

                        <div className="flex flex-col gap-3 pl-3 h-full">
                           <div className="flex justify-between items-start">
                              <div>
                                 <h4 className="font-bold text-gray-800 text-lg">{staff.name}</h4>
                                 <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 font-mono bg-gray-50 px-2 py-0.5 rounded w-fit">
                                    <Phone size={12} className="text-gray-400" /> {session?.role === 'ADMIN' || permissionSettings.showSensitiveInfo ? staff.phone : maskPhone(staff.phone) || '无电话'}
                                 </div>
                              </div>
                              {record ? (
                                 <span className={`text-xs px-2 py-1 rounded font-bold whitespace-nowrap ${
                                    record.status === 'NORMAL' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                 }`}>
                                    {record.status === 'NORMAL' ? '正常' : '迟到'}
                                 </span>
                              ) : (
                                 <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-400 font-bold whitespace-nowrap">
                                    缺勤
                                 </span>
                              )}
                           </div>
                           
                           <div className="mt-auto pt-3 border-t border-[#E5EEF8] flex justify-between items-center">
                              <span className={`text-[10px] px-2 py-0.5 rounded border truncate max-w-[120px] ${isLeader ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                 {roleText}
                              </span>
                              <div className="text-xs flex items-center gap-1 text-gray-400 font-medium">
                                 <Clock size={12} />
                                 {record ? new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                              </div>
                           </div>
                        </div>
                     </div>
                  );
               })}
               {displayedStaff.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                     暂无人员数据
                  </div>
               )}
            </div>
         ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
                     <tr>
                        <th className="p-3 pl-4">姓名 / 电话</th>
                        <th className="p-3">身份角色</th>
                        <th className="p-3">打卡时间</th>
                        <th className="p-3">状态</th>
                        <th className="p-3 text-right pr-4">操作</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {displayedStaff.map(staff => {
                        const record = getRecordForDate(staff.id, selectedDate, 'IN');
                        const roleText = getRoleText(staff);
                        
                        return (
                           <tr key={staff.id} className="hover:bg-gray-50 transition-colors group">
                              <td className="p-3 pl-4">
                                 <div className="font-bold text-gray-800">{staff.name}</div>
                                 <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 font-mono">
                                    <Phone size={10} /> {session?.role === 'ADMIN' || permissionSettings.showSensitiveInfo ? staff.phone : maskPhone(staff.phone) || '-'}
                                 </div>
                              </td>
                              <td className="p-3 text-gray-600">
                                 <span className={`text-xs px-2 py-0.5 rounded ${roleText.includes('组长') ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {roleText}
                                 </span>
                              </td>
                              <td className="p-3 text-gray-600 font-mono">
                                 {record ? new Date(record.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}
                              </td>
                              <td className="p-3">
                                 {record ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                                       record.status === 'NORMAL' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                                    }`}>
                                       {record.status === 'NORMAL' ? <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> : <AlertCircle size={10} />}
                                       {record.status === 'NORMAL' ? '正常' : '迟到'}
                                    </span>
                                 ) : (
                                    <span className="text-gray-400 text-xs italic">未打卡</span>
                                 )}
                              </td>
                              <td className="p-3 text-right pr-4">
                                 <button 
                                    onClick={() => setSelectedStaff(staff)}
                                    className="text-[#1677FF] hover:text-[#0B5FCC] text-xs font-bold bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100/50 transition-all duration-300 shadow-sm"
                                 >
                                    查看详情
                                 </button>
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         )}
      </div>

      {selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedStaff(null)}>
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
              <div className="p-6 pb-0 flex justify-between items-start">
                 <div>
                    <h3 className="text-lg font-bold text-gray-800">考勤详情</h3>
                    <p className="text-xs text-gray-400">{selectedDate}</p>
                 </div>
                 <button onClick={() => setSelectedStaff(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              
              <div className="p-6">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-500">
                       {selectedStaff.name[0]}
                    </div>
                    <div>
                       <h4 className="text-xl font-bold text-gray-900">{selectedStaff.name}</h4>
                       <p className="text-gray-500 text-sm mt-1">{getRoleText(selectedStaff)}</p>
                       <p className="text-gray-400 text-xs mt-0.5 font-mono">
                         {session?.role === 'ADMIN' || permissionSettings.showSensitiveInfo ? selectedStaff.phone : maskPhone(selectedStaff.phone) || '无联系方式'}
                       </p>
                    </div>
                 </div>

                 {isEditing ? (
                   <div className="space-y-4">
                     <div>
                       <label className="text-xs font-bold text-gray-500 mb-1 block">上班时间</label>
                       <input 
                         type="time" 
                         value={editInTime}
                         onChange={e => setEditInTime(e.target.value)}
                         className="w-full border border-gray-300 rounded-lg p-2 font-mono"
                       />
                     </div>
                     <div>
                       <label className="text-xs font-bold text-gray-500 mb-1 block">下班时间</label>
                       <input 
                         type="time" 
                         value={editOutTime}
                         onChange={e => setEditOutTime(e.target.value)}
                         className="w-full border border-gray-300 rounded-lg p-2 font-mono"
                       />
                     </div>
                     <div className="flex gap-2 pt-2">
                       <button onClick={() => setIsEditing(false)} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">取消</button>
                       <button onClick={handleSaveEdits} className="flex-1 py-2.5 bg-[#1677FF] text-white rounded-xl font-bold hover:bg-[#0B5FCC] transition-all duration-300 shadow-sm shadow-blue-100/20">保存</button>
                     </div>
                   </div>
                 ) : (
                   <div className="space-y-4">
                      {renderRecordBlock(inRecord, 'IN')}
                      {renderRecordBlock(outRecord, 'OUT')}
                      
                      {(session?.role === 'ADMIN') && (
                        <div className="pt-4 border-t border-[#E5EEF8]">
                           <button onClick={() => setIsEditing(true)} className="w-full py-2.5 bg-blue-50 text-[#1677FF] text-sm font-extrabold rounded-xl hover:bg-blue-100/60 border border-blue-100/50 flex items-center justify-center gap-2 transition-all duration-300 shadow-sm">
                              <Edit2 size={16} /> 编辑 / 补卡
                           </button>
                        </div>
                      )}
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {previewPhoto && (
         <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPreviewPhoto(null)}>
            <div className="relative max-w-4xl w-full max-h-screen flex flex-col items-center">
               <button onClick={() => setPreviewPhoto(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"><X size={32} /></button>
               <img src={previewPhoto} className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} alt="Attendance Photo" />
               <div className="mt-4 flex gap-4">
                  <button onClick={() => {
                     const link = document.createElement('a');
                     link.href = previewPhoto;
                     link.download = `attendance_photo_${Date.now()}.jpg`;
                     link.click();
                  }} className="text-white text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full backdrop-blur-md transition-colors flex items-center gap-2">
                     <Download size={16} /> 下载原图
                  </button>
                  <button onClick={() => {}} className="text-white text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full backdrop-blur-md transition-colors flex items-center gap-2">
                     <ZoomIn size={16} /> 点击图片放大
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default AttendanceReports;
