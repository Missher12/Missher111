
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, BarChart3, Menu, X, LogOut, Megaphone, Briefcase, Settings, ScanLine, FileText, Home, ClipboardCheck, Play } from 'lucide-react';

import Dashboard from './components/Dashboard/Dashboard';
import StaffDashboard from './components/Staff/StaffDashboard'; 
import AttendanceReports from './components/Attendance/AttendanceReports';
import Login from './components/Auth/Login';
import AnnouncementManager from './components/System/AnnouncementManager';
import OutsourcedManager from './components/Staff/OutsourcedManager';
import SystemSettings from './components/System/SystemSettings';
import TrainingCheckinManager from './components/Attendance/TrainingCheckinManager';
import CheckInSystem from './components/Attendance/CheckInSystem'; 
import IntervieweeDashboard from './components/Interview/IntervieweeDashboard';
import { isSameDay, calculateAttendanceStatus } from './utils';

import { 
  AdminUser,
  AttendanceRecord, Staff, QueueTicket, UserSession, Announcement, Group, 
  RegistrationRecord, AttendanceConfig, AttendanceStatus, PermissionSettings, LoginConfig, RegistrationConfig
} from './types';

// Mock Data for Initial Load (Bootstrap - Minimal)
const MOCK_GROUPS: Group[] = [
  { id: 'g_pending_allocation', name: '总人员待分配组', description: '新入职或暂无固定分组的人员中转站' },
  { id: 'g_service_center', name: '服务中心', description: '核心服务与支持团队' },
  { id: 'g_out', name: '编外机动组', description: '负责临时性支援任务' },
];

const App: React.FC = () => {
  // --- Global State ---
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- Data Models (Synced with LocalStorage/Backend) ---
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [queueData, setQueueData] = useState<QueueTicket[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [registrationList, setRegistrationList] = useState<RegistrationRecord[]>([]);
  const [onSiteRecords, setOnSiteRecords] = useState<RegistrationRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  // --- Configuration & UI State ---
  const [systemDomain, setSystemDomain] = useState('https://workpulse.app');
  
  const [attendanceConfig, setAttendanceConfig] = useState<AttendanceConfig>({ startTime: '09:00', endTime: '18:00', overtimeStart: '19:00' });
  const [permissionSettings, setPermissionSettings] = useState<PermissionSettings>({
      allowLeaderExport: true,
      allowLeaderBroadcast: true,
      allowStaffViewTeam: false,
      showSensitiveInfo: true, 
      enableCheckIn: true,
  });
  const [loginConfig, setLoginConfig] = useState<LoginConfig>({ 
    title: 'STAFFTool', 
    subtitle: '', 
    imageUrl: '', 
    logoUrl: '',
    enableCandidateLogin: true 
  });
  const [registrationConfig, setRegistrationConfig] = useState<RegistrationConfig>({ masterPrefix: 'M', onSitePrefix: 'S' });

  // --- Initialization ---
  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      // Simulate backend delay or wait for DOM
      await new Promise(resolve => setTimeout(resolve, 300)); 

      const load = (key: string, fallback: any) => {
         const saved = localStorage.getItem(key);
         try { return saved ? JSON.parse(saved) : fallback; } catch { return fallback; }
      };

      // Load all data
      setStaffList(load('staffList', []));
      setQueueData(load('queueData', []));
      setAnnouncements(load('announcements', []));
      setRegistrationList(load('registrationList', []));
      setOnSiteRecords(load('onSiteRecords', []));
      setGroups(load('groups', MOCK_GROUPS));
      setAdminUsers(load('adminUsers', [{ username: 'admin', password: 'password' }]));
      setSystemDomain(load('systemDomain', 'https://workpulse.app'));
      
      // Load Configs
      setAttendanceConfig(load('attendanceConfig', { startTime: '09:00', endTime: '18:00', overtimeStart: '19:00' }));
      setPermissionSettings(load('permissionSettings', { allowLeaderExport: true, allowLeaderBroadcast: true, allowStaffViewTeam: false, showSensitiveInfo: true, enableCheckIn: true }));
      setLoginConfig(load('loginConfig', { title: 'STAFFTool', subtitle: '', imageUrl: '', logoUrl: '', enableCandidateLogin: true }));
      setRegistrationConfig(load('registrationConfig', { masterPrefix: 'M', onSitePrefix: 'S' }));

      // Load Session
      setSession(load('userSession', null));

      // Load Attendance
      setAttendanceRecords(load('attendanceRecords', []));

      setIsLoading(false);
    };

    initApp();
  }, []);

  // --- Real-time Sync & Persistence (Frontend-as-Backend) ---
  const save = (key: string, data: any) => {
      if(!isLoading) localStorage.setItem(key, JSON.stringify(data));
  };

  useEffect(() => {
    if (isLoading) return;
    save('userSession', session);
    save('staffList', staffList);
    save('queueData', queueData);
    save('announcements', announcements);
    save('registrationList', registrationList);
    save('onSiteRecords', onSiteRecords);
    save('attendanceRecords', attendanceRecords);
    save('groups', groups);
    save('adminUsers', adminUsers);
    
    save('systemDomain', systemDomain);
    save('attendanceConfig', attendanceConfig);
    save('permissionSettings', permissionSettings);
    save('loginConfig', loginConfig);
    save('registrationConfig', registrationConfig);
  }, [
    session, staffList, queueData, announcements, registrationList, onSiteRecords, 
    attendanceRecords, groups, adminUsers, 
    systemDomain, attendanceConfig, permissionSettings, loginConfig, registrationConfig, isLoading
  ]);

  // Sync Listener (Cross-tab synchronization)
  useEffect(() => {
    if (isLoading) return;

    const syncStateFromStorage = () => {
      const syncItem = (key: string, setter: React.Dispatch<React.SetStateAction<any>>) => {
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setter((prev: any) => {
              if (JSON.stringify(prev) !== saved) return parsed;
              return prev;
            });
          } catch(e) { console.error('Sync error for ' + key, e); }
        }
      };

      syncItem('userSession', setSession); 
      syncItem('queueData', setQueueData);
      syncItem('attendanceRecords', setAttendanceRecords);
      syncItem('registrationList', setRegistrationList);
      syncItem('onSiteRecords', setOnSiteRecords);
      syncItem('staffList', setStaffList);
      syncItem('groups', setGroups);
      syncItem('announcements', setAnnouncements);
      syncItem('adminUsers', setAdminUsers);
      syncItem('attendanceConfig', setAttendanceConfig);
      syncItem('permissionSettings', setPermissionSettings);
      syncItem('loginConfig', setLoginConfig);
      syncItem('registrationConfig', setRegistrationConfig);
      syncItem('systemDomain', setSystemDomain);
    };

    window.addEventListener('storage', syncStateFromStorage);
    const intervalId = setInterval(syncStateFromStorage, 2000);

    return () => {
      window.removeEventListener('storage', syncStateFromStorage);
      clearInterval(intervalId);
    };
  }, [isLoading]);

  // --- Actions ---

  const handleLogin = (userId: string, role: 'ADMIN' | 'USER') => {
    if (role === 'ADMIN') {
      setSession({ userId, role });
      setActiveTab('dashboard');
    } else {
      let staff = staffList.find(s => s.id === userId);
      // Fallback search in registration lists for candidates
      if (!staff) {
        const candidate = registrationList.find(r => r.id === userId) || onSiteRecords.find(r => r.id === userId);
        if (candidate) {
          staff = {
            id: candidate.id,
            name: candidate.name,
            idCard: candidate.idCard || '',
            phone: candidate.phone,
            status: 'PENDING', 
            roles: [],
            avatar: '',
            joinDate: candidate.submissionTime,
            registrationNumber: candidate.registrationNumber
          };
        }
      }

      if (staff) {
        setSession({ userId, role, staff });
        const isPendingAllocation = staff.roles.some(r => r.groupId === 'g_pending_allocation');
        const hasNoGroup = staff.roles.length === 0;
        const isNotActive = staff.status === 'PENDING' || staff.status === 'INTERVIEWED';

        if (isNotActive || isPendingAllocation || hasNoGroup) {
          setActiveTab('interviewee_dashboard');
        } else {
          setActiveTab('dashboard');
        }
      }
    };
  };

  const handleLogout = () => {
    setSession(null);
    setActiveTab('dashboard');
  };

  const handleStaffPunch = (type: 'IN' | 'OUT', photoUrl: string, status: AttendanceRecord['status'], timestamp: string) => {
    if (!session?.staff) return;
    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      staffId: session.staff.id,
      timestamp: timestamp, 
      type,
      photoUrl,
      status
    };
    setAttendanceRecords(prev => [newRecord, ...prev]);
  };

  const handleUpdateOrAddRecord = (staffId: string, dateStr: string, type: 'IN' | 'OUT', timeStr: string) => {
    if (!timeStr) return;
    const targetTimestamp = new Date(`${dateStr}T${timeStr}`);
    const newStatus = calculateAttendanceStatus(type, targetTimestamp, attendanceConfig);
    
    let recordExists = false;
    const updatedRecords = attendanceRecords.map(rec => {
      if (rec.staffId === staffId && isSameDay(rec.timestamp, dateStr) && rec.type === type) {
        recordExists = true;
        return {
          ...rec,
          timestamp: targetTimestamp.toISOString(),
          status: newStatus,
          isManual: true,
          photoUrl: rec.photoUrl 
        };
      }
      return rec;
    });
    
    if (recordExists) {
      setAttendanceRecords(updatedRecords);
    } else {
      const newRecord: AttendanceRecord = {
        id: crypto.randomUUID(),
        staffId,
        timestamp: targetTimestamp.toISOString(),
        type,
        status: newStatus,
        isManual: true
      };
      setAttendanceRecords(prev => [newRecord, ...prev]);
    }
  };

  const handleQueueCheckIn = (staffId: string) => {
    if (queueData.some(t => t.staffId === staffId)) return;
    
    let person: Staff | RegistrationRecord | undefined = staffList.find(s => s.id === staffId);
    if (!person) person = registrationList.find(r => r.id === staffId);
    if (!person) person = onSiteRecords.find(r => r.id === staffId);
    
    if (!person) return; 
    
    // Add Ticket
    const newTicket: QueueTicket = {
      id: crypto.randomUUID(),
      ticketNumber: `A-${String(queueData.length + 1).padStart(3, '0')}`,
      staffId: person.id,
      staffName: person.name,
      status: 'WAITING',
      checkInTime: new Date().toISOString()
    };
    setQueueData(prev => [...prev, newTicket]);
    
    // Auto-generate Attendance Record
    const photoUrl = 'avatar' in person ? person.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.id}`;
    const now = new Date();
    const status = calculateAttendanceStatus('IN', now, attendanceConfig);

    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      staffId: person.id,
      timestamp: now.toISOString(),
      type: 'IN',
      photoUrl: photoUrl,
      status: status
    };
    setAttendanceRecords(prev => [...prev, newRecord]);
  };

  const updateTicketStatus = (ticketId: string, status: QueueTicket['status']) => {
    setQueueData(queueData.map(t => t.id === ticketId ? { ...t, status } : t));
  };
  
  const handleBatchAddStaffFromReg = (newStaffList: Staff[]) => {
    let count = 0;
    const updatedStaffList = [...staffList];
    newStaffList.forEach(newStaff => {
       const exists = updatedStaffList.some(s => 
          (s.idCard && s.idCard === newStaff.idCard) || 
          (s.phone && s.phone === newStaff.phone && s.name === newStaff.name)
       );
       if (!exists) {
         updatedStaffList.push(newStaff);
         count++;
       }
    });
    setStaffList(updatedStaffList);
    alert(`已成功将 ${count} 名人员导入员工库。`);
  };

  // --- CRUD Wrappers ---
  const handleAddGroup = (g: Group) => setGroups([...groups, g]);
  const handleUpdateGroup = (g: Group) => setGroups(groups.map(grp => grp.id === g.id ? g : grp));
  const handleDeleteGroup = (gid: string) => setGroups(groups.filter(g => g.id !== gid));
  const handleUpdateStaff = (s: Staff) => setStaffList(staffList.map(st => st.id === s.id ? s : st));
  const handleAddStaff = (s: Staff) => setStaffList([...staffList, s]);
  const handleAddAdmin = (u: AdminUser) => {
    if (adminUsers.some(a => a.username === u.username)) return false;
    setAdminUsers([...adminUsers, u]);
    return true;
  };
  const handleDeleteAdmin = (u: string) => {
    if (adminUsers.length > 1) setAdminUsers(adminUsers.filter(a => a.username !== u));
  };
  const handleUpdateAdminPassword = (u: string, p: string) => setAdminUsers(adminUsers.map(a => a.username === u ? {...a, password: p} : a));

  // --- Rendering Logic ---

  const renderContent = () => {
    if (isLoading) return <div className="flex h-full items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00A2E8]"></div></div>;

    // Interviewee / Candidate Dashboard
    if (activeTab === 'interviewee_dashboard' && session?.staff) {
      const myTicket = queueData.find(t => t.staffId === session.staff?.id);
      return <IntervieweeDashboard staff={session.staff} myTicket={myTicket} ticketsAhead={0} onLogout={handleLogout} />;
    }
    
    // Main Tabs
    switch (activeTab) {
      case 'dashboard':
        if (session?.role === 'USER' && session?.staff) {
          // Identify all user groups
          const userGroupIds = session.staff.roles.map(r => r.groupId);
          const userGroup = groups.find(g => userGroupIds.includes(g.id)); // Primary group for display
          
          const myRecords = attendanceRecords.filter(r => r.staffId === session.staff?.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          const status = myRecords[0]?.type === 'IN' ? AttendanceStatus.CLOCKED_IN : AttendanceStatus.CLOCKED_OUT;
          
          return <StaffDashboard 
              currentUser={session.staff}
              group={userGroup}
              leaders={staffList.filter(s => s.roles.some(r => userGroupIds.includes(r.groupId) && r.isLeader))}
              staffList={staffList}
              // Fixed: Filter announcements checking ALL user groups
              announcements={announcements.filter(a => !a.targetGroupId || userGroupIds.includes(a.targetGroupId))}
              attendanceStatus={status}
              attendanceHistory={myRecords.filter(r => isSameDay(r.timestamp, new Date().toISOString()))}
              attendanceConfig={attendanceConfig}
              onClockIn={(p, s, t) => handleStaffPunch('IN', p, s, t)}
              onClockOut={(p, s, t) => handleStaffPunch('OUT', p, s, t)}
            />;
        }
        return <Dashboard 
          attendanceRecords={attendanceRecords}
          queueData={queueData}
          announcements={announcements}
          isAdmin={session?.role === 'ADMIN'}
          staffList={staffList}
          groups={groups}
          currentUser={session?.staff}
        />;

      case 'reports':
        let visibleGroups = groups;
        if (session?.role === 'USER' && session.staff) {
           const leaderGroupIds = session.staff.roles.filter(r => r.isLeader).map(r => r.groupId);
           visibleGroups = groups.filter(g => leaderGroupIds.includes(g.id));
        }
        return <AttendanceReports 
          staffList={staffList} 
          groups={visibleGroups} 
          allRecords={attendanceRecords}
          session={session}
          permissionSettings={permissionSettings}
          attendanceConfig={attendanceConfig}
          onUpdateOrAddRecord={handleUpdateOrAddRecord}
        />;
      
      case 'checkin_system':
        return <CheckInSystem 
          queue={queueData}
          registrationList={registrationList}
          onSiteRecords={onSiteRecords}
          staffList={staffList}
          onCheckIn={handleQueueCheckIn}
          onClearQueue={() => setQueueData([])}
          onUpdateTicketStatus={updateTicketStatus}
        />;

      case 'training_checkin': 
        return <TrainingCheckinManager 
          queue={queueData}
          registrationList={registrationList}
          onSiteRecords={onSiteRecords} 
          onUpdateOnSiteRecords={setOnSiteRecords}
          staffList={staffList}
          onUpdateRegistration={setRegistrationList}
          onBatchAddStaff={handleBatchAddStaffFromReg}
          permissionSettings={permissionSettings}
          session={session}
          registrationConfig={registrationConfig}
        />;

      case 'outsourced':
        return <OutsourcedManager 
          permissionSettings={permissionSettings}
          staffList={staffList} 
          groups={groups} 
          registrationList={registrationList} 
          onSiteRecords={onSiteRecords} 
          onUpdateStaff={handleUpdateStaff} 
          onAddStaff={handleAddStaff} 
          onBatchAddStaff={handleBatchAddStaffFromReg}
          onAddGroup={handleAddGroup} 
          onUpdateGroup={handleUpdateGroup} 
          onDeleteGroup={handleDeleteGroup} 
        />;
      case 'announcements':
        return <AnnouncementManager currentUserRole={session?.role || 'USER'} currentUserGroups={session?.staff?.roles || []} announcements={announcements} onAddAnnouncement={(a) => setAnnouncements([a, ...announcements])} onDeleteAnnouncement={(id) => setAnnouncements(announcements.filter(a => a.id !== id))} currentUserName={session?.staff?.name || '管理员'} />;
      case 'settings':
        return <SystemSettings 
          onSave={(s) => { setSystemDomain(s.domain); setAttendanceConfig(s.attendance); setPermissionSettings(s.permissions); setLoginConfig(s.loginConfig); setRegistrationConfig(s.registrationConfig); }} 
          initialDomain={systemDomain} 
          initialAttendanceConfig={attendanceConfig} 
          initialPermissionSettings={permissionSettings}
          initialLoginConfig={loginConfig}
          initialRegistrationConfig={registrationConfig}
          adminUsers={adminUsers}
          onAddAdmin={handleAddAdmin}
          onDeleteAdmin={handleDeleteAdmin}
          onUpdateAdminPassword={handleUpdateAdminPassword}
        />;
      default: return null;
    }
  };

  // If no session, show Login
  if (!session) {
      return <Login staffList={staffList} registrationList={registrationList} onLogin={handleLogin} adminUsers={adminUsers} loginConfig={loginConfig} defaultTab="CANDIDATE" />;
  }

  const isLeader = session?.role === 'USER' && session.staff?.roles.some(r => r.isLeader);
  const canScanCheckIn = permissionSettings.enableCheckIn && session?.role === 'USER' && session.staff?.roles.some(r => r.groupId === 'g_out' || r.groupId === 'g_service_center');
  const isFullScreen = activeTab === 'interviewee_dashboard';

  // Symmetrical Top Navigation Items (Uniform width tab styling)
  const navigationItems = [];
  if (session?.role === 'ADMIN') {
    navigationItems.push(
      { id: 'dashboard', label: '工作台', icon: LayoutDashboard },
      { id: 'training_checkin', label: '报名数据', icon: ClipboardCheck },
      { id: 'checkin_system', label: '现场签到', icon: ScanLine },
      { id: 'outsourced', label: '分组与编外', icon: Briefcase },
      { id: 'announcements', label: '公告通知', icon: Megaphone },
      { id: 'reports', label: '考勤报表', icon: BarChart3 },
      { id: 'settings', label: '系统设置', icon: Settings },
    );
  } else {
    navigationItems.push({ id: 'dashboard', label: '我的主页', icon: Home });
    if (canScanCheckIn) {
      navigationItems.push({ id: 'checkin_system', label: '现场签到', icon: ScanLine });
    }
    if (isLeader) {
      navigationItems.push({ id: 'reports', label: '考勤记录', icon: BarChart3 });
      if (permissionSettings.allowLeaderBroadcast) {
        navigationItems.push({ id: 'announcements', label: '发布公告', icon: Megaphone });
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-gray-900 font-sans selection:bg-sky-100 selection:text-sky-600">
      {/* 🚀 Scroll Leak Shield: Fades out top background so content gracefully scrolls under and doesn't show at the very top */}
      {!isFullScreen && (
        <div className="fixed top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#F8FAFC] via-[#F8FAFC] to-[#F8FAFC]/0 z-40 pointer-events-none" />
      )}

      {/* 🚀 Image-inspired Premium Floating Top Navigation Header */}
      {!isFullScreen && (
        <header className="fixed top-4 left-4 right-4 md:left-6 md:right-6 lg:left-8 lg:right-8 z-50 bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.04)]">
          <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              
              {/* BRAND / LOGO IDENTITY (Matches the gorgeous cyan/sky blue theme) */}
              <div 
                className="flex items-center gap-2.5 cursor-pointer select-none group" 
                onClick={() => setActiveTab('dashboard')}
              >
                <div className="w-9 h-9 bg-[#00A2E8] rounded-xl flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:bg-[#008ec7] group-hover:scale-105 transition-all">
                  <Play size={15} className="text-white fill-white translate-x-[1px]" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h1 className="text-sm font-black text-slate-950 tracking-tight leading-none group-hover:text-[#00A2E8] transition-colors">Staff</h1>
                    <span className="text-[9px] font-bold bg-sky-50 text-[#00A2E8] px-1.5 py-0.5 rounded uppercase tracking-wide">Sys</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">一体化考勤管理后台</p>
                </div>
              </div>

              {/* CENTER NAVIGATION: Symmetrical Horizontal Dock Capsule built directly from the image */}
              <div className="hidden lg:flex items-center bg-[#EEF2F6]/70 border border-slate-200/30 p-1 rounded-full shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03)] my-2">
                <nav className="flex items-center gap-1.5 no-scrollbar animate-in fade-in duration-300">
                  {navigationItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center justify-start h-9 w-9 hover:w-[136px] rounded-full font-bold text-xs tracking-wide transition-all duration-300 ease-in-out select-none cursor-pointer overflow-hidden group/btn border bg-transparent border-transparent`}
                      >
                        {/* Dynamic Icon circle container styled 1:1 to the image upload */}
                        <div className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center transition-all duration-350 shadow-sm ${
                          isActive 
                            ? 'bg-[#00A2E8] text-white shadow-md shadow-[#00A2E8]/25 scale-105' 
                            : 'bg-white text-slate-500 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)] group-hover/btn:border-slate-300/60'
                        }`}>
                          <Icon size={13} className={isActive ? 'text-white' : 'text-slate-600 group-hover/btn:text-slate-800'} />
                        </div>
                        <span className={`ml-2 text-[11px] font-black whitespace-nowrap transition-all duration-350 opacity-0 group-hover/btn:opacity-100 translate-x-1 group-hover/btn:translate-x-0 ${
                          isActive ? 'text-[#00A2E8]' : 'text-slate-600 group-hover/btn:text-slate-900'
                        }`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* RIGHT PROFILE & CONTROLS */}
              <div className="flex items-center gap-4">
                {/* User metadata label */}
                <div className="hidden md:flex flex-col items-end text-right">
                  <span className="text-xs font-bold text-slate-800 leading-none mb-1">{session?.staff?.name || '管理员'}</span>
                  <span className="text-[9px] text-slate-500 font-extrabold bg-slate-100 border border-slate-200/40 px-2 py-0.5 rounded-md">
                    {session?.role === 'ADMIN' ? '系统管理员' : (session?.staff?.roles[0]?.groupName || '在职员工')}
                  </span>
                </div>

                {/* Logout Button */}
                <button 
                  onClick={handleLogout} 
                  title="退出系统"
                  className="text-slate-400 hover:text-red-500 transition-all bg-slate-50 hover:bg-rose-50 p-2 rounded-xl border border-slate-100 hover:border-rose-100 flex items-center justify-center cursor-pointer"
                >
                  <LogOut size={15} />
                </button>

                {/* Mobile Hamburger menu toggle */}
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)} 
                  className="lg:hidden text-slate-600 p-2 hover:bg-slate-100 rounded-xl border border-slate-200"
                >
                  {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>

            </div>
          </div>

          {/* MOBILE EXPANDED MENU DRAWER */}
          {sidebarOpen && (
            <div className="lg:hidden bg-white border-t border-gray-100 py-3 shadow-lg animate-in slide-in-from-top duration-200">
              <div className="px-4 space-y-1">
                {navigationItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button 
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }} 
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                        isActive 
                          ? 'bg-sky-50 text-[#00A2E8]' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-[#00A2E8]' : 'text-slate-400'} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                <div className="pt-2 mt-2 border-t border-gray-100 px-4 flex items-center justify-between">
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">{session?.staff?.name || '管理员'}</p>
                    <p className="text-slate-400">{session?.role === 'ADMIN' ? '系统管理员' : (session?.staff?.roles[0]?.groupName || '在职员工')}</p>
                  </div>
                  <button onClick={handleLogout} className="text-xs text-[#00A2E8] font-bold bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg flex items-center gap-1">
                    <LogOut size={12} /> 退出登录
                  </button>
                </div>
              </div>
            </div>
          )}
        </header>
      )}

      {/* Main viewport with precise floating header offsets */}
      <main className="flex-1 flex flex-col w-full min-h-0 pt-[82px] md:pt-[92px] lg:pt-[100px] relative z-30">
        <div className="flex-1 max-w-[1360px] w-full mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-3 duration-350">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
