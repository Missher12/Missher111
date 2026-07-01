import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  ClipboardList, 
  TrendingUp,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { QueueTicket, RegistrationRecord, Staff, PermissionSettings, UserSession, RegistrationConfig } from '../../types';
import StaffRegistration from '../Staff/StaffRegistration';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface TrainingCheckinManagerProps {
  queue: QueueTicket[];
  registrationList: RegistrationRecord[];
  onSiteRecords: RegistrationRecord[]; 
  onUpdateOnSiteRecords: (records: RegistrationRecord[]) => void;
  staffList: Staff[];
  onUpdateRegistration: (records: RegistrationRecord[]) => void;
  onBatchAddStaff: (staffList: Staff[]) => void;
  permissionSettings: PermissionSettings;
  session: UserSession | null;
  registrationConfig: RegistrationConfig;
  activeSubTab?: 'DASHBOARD' | 'MASTER_LIST' | 'ONSITE';
  onSubTabChange?: (tab: 'DASHBOARD' | 'MASTER_LIST' | 'ONSITE') => void;
}

const TrainingCheckinManager: React.FC<TrainingCheckinManagerProps> = ({
  queue,
  registrationList,
  onSiteRecords,
  onUpdateOnSiteRecords,
  staffList,
  onUpdateRegistration,
  onBatchAddStaff,
  permissionSettings,
  session,
  registrationConfig,
  activeSubTab,
  onSubTabChange
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'DASHBOARD' | 'MASTER_LIST' | 'ONSITE'>('DASHBOARD');
  
  const activeTab = activeSubTab || internalActiveTab;
  const setActiveTab = onSubTabChange || setInternalActiveTab;

  // STRICT PERMISSION: Only ADMIN sees Master List & On-Site Registration.
  const isAdmin = session?.role === 'ADMIN';
  const showMasterList = isAdmin;
  const showOnSite = isAdmin;

  // --- Statistics Logic ---
  const dashboardStats = useMemo(() => {
    // 1. Total Check-ins
    const checkInCount = queue.length;
    
    // 2. Total Registered (Master + OnSite) - Deduplicated by ID
    const allIds = new Set([...registrationList.map(r => r.id), ...onSiteRecords.map(r => r.id)]);
    const totalRegistered = allIds.size;

    // 3. Gender Distribution of CHECKED-IN users
    let maleCount = 0;
    let femaleCount = 0;
    
    // Helper to find person details
    const findPerson = (id: string) => {
      return registrationList.find(r => r.id === id) || 
             onSiteRecords.find(r => r.id === id) || 
             staffList.find(s => s.id === id);
    };

    queue.forEach(ticket => {
      const person = findPerson(ticket.staffId);
      if (person) {
        const g = (person as any).gender; 
        if (g === '男' || g === 'Male') maleCount++;
        else if (g === '女' || g === 'Female') femaleCount++;
      }
    });

    // 4. Check-in Timeline
    const timelineData: Record<string, number> = {};
    queue.forEach(t => {
       if(t.checkInTime) {
         const hour = new Date(t.checkInTime).getHours();
         const key = `${hour}:00`;
         timelineData[key] = (timelineData[key] || 0) + 1;
       }
    });
    const timelineChartData = Object.keys(timelineData).map(k => ({ name: k, count: timelineData[k] })).sort((a,b) => parseInt(a.name) - parseInt(b.name));

    return {
      checkInCount,
      totalRegistered,
      checkInRate: totalRegistered > 0 ? Math.round((checkInCount / totalRegistered) * 100) : 0,
      genderData: [
        { name: '男', value: maleCount },
        { name: '女', value: femaleCount }
      ],
      timelineChartData,
      maleCount,
      femaleCount
    };
  }, [queue, registrationList, onSiteRecords, staffList]);

  const COLORS = ['#1677FF', '#f43f5e', '#64748b'];

  // Construct tabs dynamically
  const tabs = [
    { id: 'DASHBOARD', label: '数据看板', icon: LayoutDashboard },
  ];

  if (showOnSite) {
    tabs.push({ id: 'ONSITE', label: '现场报名录入', icon: UserPlus });
  }

  if (showMasterList) {
    tabs.push({ id: 'MASTER_LIST', label: '汇总名单管理', icon: ClipboardList });
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in pb-20">
      
      {/* Tab Navigation */}
      <div className="bg-white p-2 md:p-2.5 rounded-2xl shadow-sm border border-[#E5EEF8]">
         <div className="flex p-1 bg-slate-50 rounded-xl overflow-x-auto w-full no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-white text-[#1677FF] shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
         </div>
      </div>

      {/* --- DASHBOARD VIEW --- */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-4 md:space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#E5EEF8] shadow-sm hover:shadow-md hover:border-blue-100/60 transition-all duration-300">
                 <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">已签到人数</p>
                    <div className="p-2.5 bg-green-50 text-green-600 rounded-xl"><UserCheckIcon size={16} /></div>
                 </div>
                 <h3 className="text-3xl font-black text-slate-800">{dashboardStats.checkInCount}</h3>
                 <p className="text-xs text-slate-500 mt-1 font-semibold">签到率 {dashboardStats.checkInRate}%</p>
              </div>
              
              {showOnSite && (
                <div className="bg-white p-5 rounded-2xl border border-[#E5EEF8] shadow-sm hover:shadow-md hover:border-blue-100/60 transition-all duration-300">
                   <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">现场报名</p>
                      <div className="p-2.5 bg-blue-50 text-[#1677FF] rounded-xl"><UserPlus size={16} /></div>
                   </div>
                   <h3 className="text-3xl font-black text-slate-800">{onSiteRecords.length}</h3>
                   <p className="text-xs text-slate-500 mt-1 font-semibold">今日新增录入</p>
                </div>
              )}

              {showMasterList && (
                <div className="bg-white p-5 rounded-2xl border border-[#E5EEF8] shadow-sm hover:shadow-md hover:border-blue-100/60 transition-all duration-300">
                   <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">总名单人数</p>
                      <div className="p-2 bg-blue-50 text-[#1677FF] rounded-lg"><ClipboardList size={16} /></div>
                   </div>
                   <h3 className="text-3xl font-black text-slate-800">{registrationList.length}</h3>
                   <p className="text-xs text-slate-500 mt-1 font-semibold">包含所有渠道数据</p>
                </div>
              )}
              <div className="bg-white p-5 rounded-2xl border border-[#E5EEF8] shadow-sm hover:shadow-md hover:border-blue-100/60 transition-all duration-300">
                 <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">待签到</p>
                    <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl"><TrendingUp size={16} /></div>
                 </div>
                 <h3 className="text-3xl font-black text-slate-800">{dashboardStats.totalRegistered - dashboardStats.checkInCount}</h3>
                 <p className="text-xs text-slate-500 mt-1 font-semibold">剩余未到场</p>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gender Chart */}
              <div className="bg-white p-6 rounded-2xl border border-[#E5EEF8] shadow-sm hover:shadow-md hover:border-blue-100/60 transition-all duration-300">
                 <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <PieChart size={18} className="text-pink-500" /> 签到人员性别分布
                 </h3>
                 <div className="h-64 flex items-center justify-center">
                    {dashboardStats.checkInCount > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                                data={dashboardStats.genderData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {dashboardStats.genderData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                          </RePieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center">
                        <PieChart size={48} className="mb-2 opacity-20" />
                        <p>暂无签到数据</p>
                      </div>
                    )}
                 </div>
              </div>

              {/* Timeline Chart */}
              <div className="bg-white p-6 rounded-2xl border border-[#E5EEF8] shadow-sm hover:shadow-md hover:border-blue-100/60 transition-all duration-300">
                 <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <BarChart3 size={18} className="text-[#1677FF]" /> 签到时间段分布
                 </h3>
                 <div className="h-64">
                    {dashboardStats.timelineChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dashboardStats.timelineChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                            <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                            <Bar dataKey="count" fill="#1677FF" radius={[4, 4, 0, 0]} barSize={20} />
                          </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <BarChart3 size={48} className="mb-2 opacity-20" />
                        <p>暂无签到数据</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* --- ON-SITE REGISTRATION VIEW (ADMIN ONLY) --- */}
      {activeTab === 'ONSITE' && showOnSite && (
        <StaffRegistration 
          records={onSiteRecords} 
          onUpdateRecords={onUpdateOnSiteRecords} 
          groups={[]} 
          onBatchAddStaff={onBatchAddStaff} 
          existingStaffList={staffList} 
          permissionSettings={permissionSettings}
          displayMode="MASTER" 
          allowExcelImport={false} 
          allowManualEntry={true}
          idPrefix={registrationConfig.onSitePrefix} 
        />
      )}

      {/* --- MASTER LIST VIEW (ADMIN ONLY) --- */}
      {activeTab === 'MASTER_LIST' && showMasterList && (
        <StaffRegistration 
          records={registrationList} 
          onUpdateRecords={onUpdateRegistration} 
          groups={[]} 
          onBatchAddStaff={onBatchAddStaff} 
          existingStaffList={staffList} 
          permissionSettings={permissionSettings}
          displayMode="ALL"
          idPrefix={registrationConfig.masterPrefix} 
        />
      )}

    </div>
  );
};

// Helper Icon
const UserCheckIcon = ({ size }: { size: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <polyline points="16 11 18 13 22 9" />
  </svg>
);

export default TrainingCheckinManager;