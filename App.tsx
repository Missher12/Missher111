
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Clock, Users, BarChart3, Menu, X, LogOut, Layers, Plane, Megaphone, Briefcase, Award, CalendarRange, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

import Dashboard from './components/Dashboard';
import Attendance from './components/Attendance';
import StaffManager from './components/StaffManager';
import AttendanceReports from './components/AttendanceReports';
import Login from './components/Login';
import IntervieweeDashboard from './components/IntervieweeDashboard';
import QueueManager from './components/QueueManager';
// import LeaveManager from './components/LeaveManager'; // Removed
import AnnouncementManager from './components/AnnouncementManager';
// import TalentPool from './components/TalentPool'; // Removed standalone
import StaffScheduleManager from './components/StaffScheduleManager';

import { AttendanceRecord, AttendanceStatus, Staff, QueueTicket, UserSession, Announcement, Group, ScheduleData, AttendanceConfig } from './types';

// Mock Data
const MOCK_GROUPS: Group[] = [
  { id: 'g1', name: '前端开发组', description: '负责Web端与小程序开发' },
  { id: 'g2', name: '后端开发组', description: '负责服务器与API架构' },
  { id: 'g3', name: 'UI设计组', description: '负责界面设计与交互体验' },
  { id: 'g4', name: '市场销售组', description: '负责客户拓展与维护' },
];

const MOCK_STAFF_DATA: Staff[] = [
  { id: 'u1', name: '李明', idCard: '1001', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', status: 'ACTIVE', roles: [{ groupId: 'g1', groupName: '前端开发组', isLeader: true }], joinDate: '2023-01-15', phone: '13800138001', isTalent: true, talentNotes: '技术骨干，潜力巨大' },
  { id: 'u2', name: '张伟', idCard: '1002', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka', status: 'ACTIVE', roles: [{ groupId: 'g1', groupName: '前端开发组', isLeader: false }], joinDate: '2023-03-22', phone: '13800138002' },
  { id: 'u3', name: '王芳', idCard: '1003', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria', status: 'ACTIVE', roles: [{ groupId: 'g4', groupName: '市场销售组', isLeader: true }], joinDate: '2023-06-10', phone: '13800138003' },
  { id: 'u4', name: '赵强', idCard: '1005', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver', status: 'PENDING', roles: [], joinDate: '2023-10-05' },
  { id: 'u5', name: '陈红', idCard: '1006', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lily', status: 'PENDING', roles: [], joinDate: '2023-10-06' },
  { id: 'u6', name: '张三', idCard: '2023', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', status: 'INTERVIEWED', roles: [], joinDate: '2023-10-07' }, // Passed but waiting group
  { id: 'u7', name: '李四', idCard: '2024', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Max', status: 'REJECTED', roles: [], joinDate: '2023-10-07', isTalent: true, talentNotes: '面试表现优秀，但暂无HC，建议回捞' },
];

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { id: 'a1', title: '关于中秋节放假的通知', content: '全体员工请注意，公司将于9月29日至10月6日放假，请提前安排好工作。祝大家节日快乐！', date: '2023-09-20', type: 'NOTICE', authorName: '管理员', isSticky: true },
  { id: 'a2', title: '新版考勤制度试运行', content: '即日起，所有员工需使用新系统进行人脸打卡，不再使用指纹考勤。', date: '2023-09-25', type: 'URGENT', authorName: '人事部' }
];

const generateMockAttendance = (staffList: Staff[]): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  staffList.filter(s => s.status === 'ACTIVE').forEach(staff => {
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (!isWeekend && Math.random() > 0.2) {
        records.push({ id: crypto.randomUUID(), staffId: staff.id, timestamp: new Date(date.setHours(8, 30)).toISOString(), type: 'IN', status: 'NORMAL' });
        records.push({ id: crypto.randomUUID(), staffId: staff.id, timestamp: new Date(date.setHours(18, 0)).toISOString(), type: 'OUT', status: 'NORMAL' });
      }
    }
  });
  return records;
};

// Sidebar Component
const Sidebar = ({ isOpen, setIsOpen, isAdmin, isLeader, currentPath, onNavigate, collapsed, toggleCollapsed, onOpenSettings }: { 
  isOpen: boolean, 
  setIsOpen: (v: boolean) => void, 
  isAdmin: boolean, 
  isLeader: boolean,
  currentPath: string,
  onNavigate: (path: string) => void,
  collapsed: boolean,
  toggleCollapsed: () => void,
  onOpenSettings: () => void
}) => {
  const navItems = [
    { name: '工作台', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: '我的打卡', path: '/attendance', icon: <Clock size={20} /> },
  ];

  // Leader / Admin features
  if (isLeader || isAdmin) {
    // Both Admin and Leader can access Queue Management
    navItems.push({ name: '排队与叫号', path: '/queue', icon: <Layers size={20} /> });

    // HR Management Section for Admin
    if (isAdmin) {
      navItems.push(
        { name: 'STAFF面试', path: '/schedule', icon: <CalendarRange size={20} /> }, // Primary Interview Tool
        { name: '成员管理', path: '/employees', icon: <Users size={20} /> } // Active Employees
      );
    }

    // Both Admin and Leader can manage these, but with different scopes
    navItems.push(
      { name: isAdmin ? '全员报表' : '组内报表', path: '/reports', icon: <BarChart3 size={20} /> },
      { name: '公告管理', path: '/announcements', icon: <Megaphone size={20} /> }
    );
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsOpen(false)} />}
      <aside 
        className={`fixed top-0 left-0 z-30 h-full bg-slate-900 text-white transition-all duration-300 ease-in-out shadow-2xl flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          ${collapsed ? 'w-20' : 'w-64'}
        `}
      >
        <div className={`flex items-center h-16 border-b border-slate-800 transition-all shrink-0 ${collapsed ? 'justify-center px-0' : 'justify-between px-6'}`}>
          {!collapsed && <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent whitespace-nowrap overflow-hidden">WorkPulse</span>}
          {collapsed && <span className="font-bold text-blue-400">WP</span>}
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white"><X size={24} /></button>
        </div>
        
        <nav className="px-3 py-6 space-y-2 overflow-y-auto flex-1">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <a 
                key={item.path} 
                href={`#${item.path}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.path);
                  setIsOpen(false);
                }} 
                title={collapsed ? item.name : ''}
                className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all group relative
                  ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <div className="shrink-0">{item.icon}</div>
                {!collapsed && <span className="font-medium whitespace-nowrap overflow-hidden">{item.name}</span>}
              </a>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-slate-800 p-3 space-y-2 bg-slate-900 shrink-0">
          {/* Settings Button (Admin Only) */}
          {isAdmin && (
            <button
              onClick={onOpenSettings}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all ${collapsed ? 'justify-center' : ''}`}
              title="系统设置"
            >
              <Settings size={20} />
              {!collapsed && <span className="font-medium">系统设置</span>}
            </button>
          )}

          {/* Collapse Toggle for Desktop */}
          <button 
            onClick={toggleCollapsed}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-2"><ChevronLeft size={20} /> <span className="text-sm">收起菜单</span></div>}
          </button>
        </div>
      </aside>
    </>
  );
};

// Main App Component
const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Custom Hash Router
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/');
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash.slice(1) || '/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
  };

  // -- Global State --
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  
  const [staffList, setStaffList] = useState<Staff[]>(() => {
    const saved = localStorage.getItem('wp_staffList');
    return saved ? JSON.parse(saved) : MOCK_STAFF_DATA;
  });

  const [groupList, setGroupList] = useState<Group[]>(() => {
    const saved = localStorage.getItem('wp_groups');
    return saved ? JSON.parse(saved) : MOCK_GROUPS;
  });
  
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('wp_allAttendance');
    if (saved) return JSON.parse(saved);
    return generateMockAttendance(MOCK_STAFF_DATA);
  });

  // NEW: Attendance Config State
  const [attendanceConfig, setAttendanceConfig] = useState<AttendanceConfig>(() => {
    const saved = localStorage.getItem('wp_attendanceConfig');
    return saved ? JSON.parse(saved) : { startTime: '09:00', endTime: '18:00', overtimeStart: '19:00' };
  });
  
  const [queue, setQueue] = useState<QueueTicket[]>(() => {
    const saved = localStorage.getItem('wp_queue');
    return saved ? JSON.parse(saved) : [];
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem('wp_announcements');
    return saved ? JSON.parse(saved) : MOCK_ANNOUNCEMENTS;
  });

  const [scheduleData, setScheduleData] = useState<ScheduleData>(() => {
    const saved = localStorage.getItem('wp_schedule');
    return saved ? JSON.parse(saved) : { headers: [], dynamicHeaders: [], rows: [] };
  });

  // Persistence
  useEffect(() => localStorage.setItem('wp_staffList', JSON.stringify(staffList)), [staffList]);
  useEffect(() => localStorage.setItem('wp_groups', JSON.stringify(groupList)), [groupList]);
  useEffect(() => localStorage.setItem('wp_allAttendance', JSON.stringify(allAttendanceRecords)), [allAttendanceRecords]);
  useEffect(() => localStorage.setItem('wp_queue', JSON.stringify(queue)), [queue]);
  useEffect(() => localStorage.setItem('wp_announcements', JSON.stringify(announcements)), [announcements]);
  useEffect(() => localStorage.setItem('wp_schedule', JSON.stringify(scheduleData)), [scheduleData]);
  useEffect(() => localStorage.setItem('wp_attendanceConfig', JSON.stringify(attendanceConfig)), [attendanceConfig]);

  // Real-time polling for Interviewee
  // This simulates a websocket connection by polling localStorage for changes
  useEffect(() => {
    let interval: any;
    if (userSession?.role === 'USER' && userSession.staff?.status === 'PENDING') {
      interval = setInterval(() => {
        const savedQueue = localStorage.getItem('wp_queue');
        if (savedQueue) {
          const parsedQueue = JSON.parse(savedQueue);
          // Simple equality check to see if queue length changed or status changed
          // In production, use deep comparison or socket
          if (JSON.stringify(parsedQueue) !== JSON.stringify(queue)) {
            setQueue(parsedQueue);
          }
        }
      }, 2000); // Check every 2 seconds
    }
    return () => clearInterval(interval);
  }, [userSession, queue]);


  // Actions
  const handleLogin = (userId: string, role: 'ADMIN' | 'USER') => {
    if (role === 'ADMIN') {
      setUserSession({ userId, role });
    } else {
      const staff = staffList.find(s => s.id === userId);
      if (staff) setUserSession({ userId, role, staff });
    }
  };

  const handleLogout = () => {
    setUserSession(null);
    navigate('/');
  };

  const handleQueueCheckIn = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff || queue.some(t => t.staffId === staffId)) return;

    const newTicket: QueueTicket = {
      id: crypto.randomUUID(),
      staffId,
      staffName: staff.name,
      ticketNumber: `A-${String(queue.length + 1).padStart(3, '0')}`,
      status: 'WAITING',
      checkInTime: new Date().toISOString()
    };
    setQueue(prev => [...prev, newTicket]);
  };

  const handleUpdateTicketStatus = (ticketId: string, status: QueueTicket['status']) => {
    setQueue(prev => {
      const updatedQueue = prev.map(t => t.id === ticketId ? { ...t, status, calledTime: status === 'CALLED' ? new Date().toISOString() : t.calledTime } : t);
      if (status === 'COMPLETED') {
        const ticket = prev.find(t => t.id === ticketId);
        if (ticket) {
          setStaffList(currStaff => currStaff.map(s => s.id === ticket.staffId ? { ...s, status: 'INTERVIEWED' } : s));
        }
      }
      return updatedQueue;
    });
  };

  const handleBatchAddStaff = (newStaffList: Staff[]) => {
    setStaffList(prev => [...newStaffList, ...prev]);
  };

  // Find user's group leader info
  const getCurrentUserGroupInfo = () => {
    if (!userSession?.staff || userSession.staff.roles.length === 0) return null;
    
    // Just grab the first group for demo purposes
    const primaryRole = userSession.staff.roles[0];
    
    // Find leader of this group
    const leader = staffList.find(s => 
      s.roles.some(r => r.groupId === primaryRole.groupId && r.isLeader)
    );

    return {
      groupName: primaryRole.groupName,
      leaderName: leader ? leader.name : '未设置',
      leaderPhone: leader && leader.phone ? leader.phone : '暂无联系方式'
    };
  };

  // Views Logic
  if (!userSession) {
    return <Login staffList={staffList} onLogin={handleLogin} />;
  }

  // Interviewee View
  if (userSession.role === 'USER' && userSession.staff?.status === 'PENDING') {
    const myTicket = queue.find(t => t.staffId === userSession.userId && t.status !== 'COMPLETED' && t.status !== 'SKIPPED');
    const ticketsAhead = queue.filter(t => t.status === 'WAITING' && new Date(t.checkInTime) < new Date(myTicket?.checkInTime || new Date())).length;
    return <IntervieweeDashboard staff={userSession.staff} myTicket={myTicket} ticketsAhead={ticketsAhead} onLogout={handleLogout} />;
  }

  // Main App State Calculation
  const isAdmin = userSession.role === 'ADMIN';
  const currentStaff = userSession.staff;
  const currentStaffId = currentStaff?.id || 'admin_placeholder';
  
  // Is this user a leader of ANY group?
  const leaderRoles = currentStaff?.roles.filter(r => r.isLeader) || [];
  const isLeader = leaderRoles.length > 0;
  const leaderGroupIds = leaderRoles.map(r => r.groupId);

  // Filter Announcements for current user
  const visibleAnnouncements = announcements.filter(a => {
    if (isAdmin) return true; // Admin sees all
    if (!a.targetGroupId) return true; // Global
    // User sees if they belong to target group
    return currentStaff?.roles.some(r => r.groupId === a.targetGroupId);
  });
  
  const myAttendanceRecords = allAttendanceRecords.filter(r => r.staffId === currentStaffId);
  const myLastRecord = myAttendanceRecords[myAttendanceRecords.length - 1];
  const myAttendanceStatus = (myLastRecord && myLastRecord.type === 'IN') ? AttendanceStatus.CLOCKED_IN : AttendanceStatus.CLOCKED_OUT;
  
  const groupInfo = getCurrentUserGroupInfo();

  const handleMyClockIn = (photoUrl: string, status: AttendanceRecord['status']) => {
    const newRecord: AttendanceRecord = { id: crypto.randomUUID(), staffId: currentStaffId, timestamp: new Date().toISOString(), type: 'IN', photoUrl, status };
    setAllAttendanceRecords(prev => [...prev, newRecord]);
  };
  const handleMyClockOut = (photoUrl: string, status: AttendanceRecord['status']) => {
    const newRecord: AttendanceRecord = { id: crypto.randomUUID(), staffId: currentStaffId, timestamp: new Date().toISOString(), type: 'OUT', photoUrl, status };
    setAllAttendanceRecords(prev => [...prev, newRecord]);
  };

  const renderContent = () => {
    switch (currentPath) {
      case '/':
        return <Dashboard 
                  attendanceRecords={myAttendanceRecords} 
                  queueData={queue} 
                  announcements={visibleAnnouncements} 
                  isAdmin={isAdmin}
                  groupInfo={groupInfo}
                />;
      case '/attendance':
        return <Attendance 
                  status={myAttendanceStatus} 
                  onClockIn={handleMyClockIn} 
                  onClockOut={handleMyClockOut} 
                  history={myAttendanceRecords} 
                  config={attendanceConfig}
                />;
      case '/reports':
        if (isAdmin || isLeader) {
          return <AttendanceReports 
                    staffList={staffList} 
                    allRecords={allAttendanceRecords} 
                    fixedGroupId={isLeader && !isAdmin ? leaderGroupIds[0] : undefined}
                  />;
        }
        return <Dashboard attendanceRecords={myAttendanceRecords} queueData={queue} announcements={visibleAnnouncements} isAdmin={isAdmin} groupInfo={groupInfo} />;
      case '/announcements':
        if (isAdmin || isLeader) {
          return <AnnouncementManager 
                    currentUserRole={isAdmin ? 'ADMIN' : 'USER'}
                    currentUserGroups={leaderRoles}
                    currentUserName={userSession.staff?.name || '管理员'}
                    announcements={announcements}
                    onAddAnnouncement={(a) => setAnnouncements(prev => [a, ...prev])}
                    onDeleteAnnouncement={(id) => setAnnouncements(prev => prev.filter(a => a.id !== id))}
                  />;
        }
        return <Dashboard attendanceRecords={myAttendanceRecords} queueData={queue} announcements={visibleAnnouncements} isAdmin={isAdmin} groupInfo={groupInfo} />;
      case '/queue':
        if (isAdmin || isLeader) { // Leader can also access queue
          return <QueueManager 
                    pendingStaff={staffList.filter(s => s.status === 'PENDING')} 
                    queue={queue}
                    onCheckIn={handleQueueCheckIn}
                    onUpdateTicketStatus={handleUpdateTicketStatus}
                  />;
        }
        return <Dashboard attendanceRecords={myAttendanceRecords} queueData={queue} announcements={visibleAnnouncements} isAdmin={isAdmin} groupInfo={groupInfo} />;
      
      // Removed /candidates (Interview Management)
      
      case '/employees':
        if (isAdmin) {
          return <StaffManager 
                    viewMode="EMPLOYEES"
                    staffList={staffList} 
                    groups={groupList}
                    onUpdateStaff={(u) => setStaffList(prev => prev.map(s => s.id === u.id ? u : s))} 
                    onAddStaff={(n) => setStaffList(prev => [n, ...prev])} 
                    onBatchAddStaff={handleBatchAddStaff}
                    onAddGroup={(g) => setGroupList(prev => [...prev, g])}
                    onDeleteGroup={(id) => setGroupList(prev => prev.filter(g => g.id !== id))}
                  />;
        }
        return <Dashboard attendanceRecords={myAttendanceRecords} queueData={queue} announcements={visibleAnnouncements} isAdmin={isAdmin} groupInfo={groupInfo} />;
        
      // Removed /talent-pool

      // New Route: Staff Schedule Manager (Renamed Logic handled in Menu but component same)
      case '/schedule':
        if (isAdmin) {
          return <StaffScheduleManager 
                   scheduleData={scheduleData}
                   onUpdateData={setScheduleData}
                 />;
        }
        return <Dashboard attendanceRecords={myAttendanceRecords} queueData={queue} announcements={visibleAnnouncements} isAdmin={isAdmin} groupInfo={groupInfo} />;

      default:
        return <Dashboard 
                  attendanceRecords={myAttendanceRecords} 
                  queueData={queue} 
                  announcements={visibleAnnouncements} 
                  isAdmin={isAdmin}
                  groupInfo={groupInfo}
                />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        isAdmin={isAdmin} 
        isLeader={isLeader} 
        currentPath={currentPath} 
        onNavigate={navigate}
        collapsed={isSidebarCollapsed}
        toggleCollapsed={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between px-6 lg:px-8 shadow-sm">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-gray-600 hover:bg-gray-100 p-2 rounded-lg"><Menu size={24} /></button>
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-sm font-semibold text-gray-800">
              {userSession.staff?.name || '超级管理员'}
              {isLeader && <span className="ml-2 bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full border border-purple-200">组长</span>}
            </span>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 p-2"><LogOut size={20} /></button>
          </div>
        </header>

        <main className="p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {renderContent()}
        </main>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Settings className="text-indigo-600" /> 系统设置
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
               <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-4">
                 <h3 className="font-bold text-indigo-800 mb-2">考勤时间规则</h3>
                 <p className="text-xs text-indigo-600">设置上下班及加班时间，系统将根据此规则自动判定员工打卡状态（迟到/早退/加班）。</p>
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">上班时间 (Start Time)</label>
                 <input 
                   type="time" 
                   value={attendanceConfig.startTime}
                   onChange={e => setAttendanceConfig({...attendanceConfig, startTime: e.target.value})}
                   className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                 />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">下班时间 (End Time)</label>
                 <input 
                   type="time" 
                   value={attendanceConfig.endTime}
                   onChange={e => setAttendanceConfig({...attendanceConfig, endTime: e.target.value})}
                   className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">加班起始时间 (Overtime Start)</label>
                 <input 
                   type="time" 
                   value={attendanceConfig.overtimeStart}
                   onChange={e => setAttendanceConfig({...attendanceConfig, overtimeStart: e.target.value})}
                   className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                 />
               </div>
            </div>

            <div className="mt-8">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-medium transition-colors"
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
