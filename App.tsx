
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, BarChart3, Menu, X, LogOut, Megaphone, Briefcase, Settings, ScanLine, FileText, Home, ClipboardCheck, Play, Users, UserPlus, ClipboardList, AlertCircle } from 'lucide-react';

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
import { isSameDay, calculateAttendanceStatus, getLocalDateKey } from './utils';

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

export const canUseCheckIn = (session: UserSession | null, permissionSettings: PermissionSettings): boolean => {
  if (!permissionSettings.enableCheckIn) return false;
  if (!session) return false;
  if (session.role === 'ADMIN') return true;
  if (session.role === 'USER' && session.staff?.isCheckInOperator) return true;
  return false;
};

const App: React.FC = () => {
  // --- Global State ---
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [trainingCheckinSubTab, setTrainingCheckinSubTab] = useState<'DASHBOARD' | 'MASTER_LIST' | 'ONSITE'>('DASHBOARD');
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

  // --- Check-in Access Control Guard ---
  useEffect(() => {
    if (isLoading) return;
    if (activeTab === 'checkin_system' && !canUseCheckIn(session, permissionSettings)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, session, permissionSettings, isLoading]);

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
    
    const regNum = (person as any).registrationNumber || '';
    
    // Add Ticket
    const newTicket: QueueTicket = {
      id: crypto.randomUUID(),
      ticketNumber: `A-${String(queueData.length + 1).padStart(3, '0')}`,
      staffId: person.id,
      staffName: person.name,
      status: 'WAITING',
      checkInTime: new Date().toISOString(),
      phone: person.phone,
      registrationNumber: regNum,
      sessionDate: getLocalDateKey(new Date().toISOString())
    };
    setQueueData(prev => [...prev, newTicket]);
  };

  const updateTicketStatus = (ticketId: string, status: QueueTicket['status'] | 'REVOKED') => {
    if (status === 'REVOKED') {
      setQueueData(queueData.filter(t => t.id !== ticketId));
    } else {
      setQueueData(queueData.map(t => t.id === ticketId ? { ...t, status } : t));
    }
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
  const handleUpdateGroup = (g: Group) => {
    setGroups(groups.map(grp => grp.id === g.id ? g : grp));
    // Synchronize group names for staff roles to prevent outdated display
    setStaffList(prevList => prevList.map(s => {
      const hasGroup = s.roles.some(r => r.groupId === g.id);
      if (!hasGroup) return s;
      const updatedRoles = s.roles.map(r => r.groupId === g.id ? { ...r, groupName: g.name } : r);
      return { ...s, roles: updatedRoles };
    }));
  };
  const handleDeleteGroup = (gid: string) => {
    if (gid === 'g_pending_allocation') {
      alert('系统预置分组，不可删除');
      return;
    }
    setGroups(groups.filter(g => g.id !== gid));
    // Automatic rollback for deleted group members to the pending allocation group
    setStaffList(prevList => prevList.map(s => {
      const hasGroup = s.roles.some(r => r.groupId === gid);
      if (!hasGroup) return s;
      let updatedRoles = s.roles.filter(r => r.groupId !== gid);
      if (updatedRoles.length === 0) {
        updatedRoles = [{
          groupId: 'g_pending_allocation',
          groupName: '总人员待分配组',
          isLeader: false
        }];
      }
      return { ...s, roles: updatedRoles };
    }));
  };
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
    if (isLoading) return <div className="flex h-full items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1677FF]"></div></div>;

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
          const todayKey = getLocalDateKey();
          const todayRecords = myRecords.filter(r => getLocalDateKey(r.timestamp) === todayKey);
          const status = (todayRecords.length > 0 && todayRecords[0].type === 'IN') ? AttendanceStatus.CLOCKED_IN : AttendanceStatus.CLOCKED_OUT;
          
          return <StaffDashboard 
              currentUser={session.staff}
              group={userGroup}
              leaders={staffList.filter(s => s.roles.some(r => userGroupIds.includes(r.groupId) && r.isLeader))}
              staffList={staffList}
              // Fixed: Filter announcements checking ALL user groups
              announcements={announcements.filter(a => !a.targetGroupId || userGroupIds.includes(a.targetGroupId))}
              attendanceStatus={status}
              attendanceHistory={myRecords}
              attendanceConfig={attendanceConfig}
              allowStaffViewTeam={permissionSettings.allowStaffViewTeam}
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
        if (!canUseCheckIn(session, permissionSettings)) {
          const isAdmin = session?.role === 'ADMIN';
          return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-[#E5EEF8] shadow-sm max-w-md mx-auto mt-20">
              <div className="p-3 bg-rose-50 text-rose-500 rounded-full mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">
                {isAdmin ? '现场签到功能已关闭' : '现场签到功能暂未开启'}
              </h3>
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                {isAdmin 
                  ? '现场签到功能已由系统设置关闭，如需调试请前往系统设置开启。'
                  : '该功能已被系统管理员关闭，或您未被授权为“签到操作员”。如有疑问，请联系现场负责人。'}
              </p>
            </div>
          );
        }
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
          activeSubTab={trainingCheckinSubTab}
          onSubTabChange={setTrainingCheckinSubTab}
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
        return <AnnouncementManager 
          currentUserRole={session?.role || 'USER'} 
          currentUserGroups={session?.staff?.roles.filter(r => r.isLeader) || []} 
          announcements={announcements} 
          onAddAnnouncement={(a) => setAnnouncements([a, ...announcements])} 
          onDeleteAnnouncement={(id) => setAnnouncements(announcements.filter(a => a.id !== id))} 
          currentUserName={session?.staff?.name || '管理员'} 
          currentUserId={session?.role === 'ADMIN' ? 'ADMIN' : (session?.staff?.id || '')}
          allowLeaderBroadcast={permissionSettings.allowLeaderBroadcast}
        />;
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
      return <Login staffList={staffList} registrationList={registrationList} onSiteRecords={onSiteRecords} onLogin={handleLogin} adminUsers={adminUsers} loginConfig={loginConfig} defaultTab="CANDIDATE" />;
  }

  const isLeader = session?.role === 'USER' && session.staff?.roles.some(r => r.isLeader);
  const canScanCheckIn = canUseCheckIn(session, permissionSettings);
  const isFullScreen = activeTab === 'interviewee_dashboard';

  // Build the Sidebar Sections grouping
  const sidebarSections: { title: string; items: { id: string; label: string; icon: any; subTab?: 'DASHBOARD' | 'MASTER_LIST' | 'ONSITE' }[] }[] = [];

  if (session?.role === 'ADMIN') {
    sidebarSections.push(
      {
        title: '工作台',
        items: [
          { id: 'dashboard', label: '工作台', icon: LayoutDashboard }
        ]
      },
      {
        title: '人员与报名',
        items: [
          { id: 'training_checkin', label: '报名数据', icon: ClipboardCheck, subTab: 'DASHBOARD' },
          { id: 'training_checkin', label: '汇总名单', icon: ClipboardList, subTab: 'MASTER_LIST' },
          { id: 'training_checkin', label: '现场报名', icon: UserPlus, subTab: 'ONSITE' },
          { id: 'outsourced', label: '分组与编外', icon: Briefcase }
        ]
      },
      {
        title: '现场管理',
        items: [
          ...(canUseCheckIn(session, permissionSettings) ? [{ id: 'checkin_system', label: '现场签到', icon: ScanLine }] : []),
          { id: 'reports', label: '考勤报表', icon: BarChart3 }
        ]
      },
      {
        title: '系统管理',
        items: [
          { id: 'announcements', label: '公告通知', icon: Megaphone },
          { id: 'settings', label: '系统设置', icon: Settings }
        ]
      }
    );
  } else {
    const userFieldItems = [];
    if (canScanCheckIn) {
      userFieldItems.push({ id: 'checkin_system', label: '现场签到', icon: ScanLine });
    }
    if (isLeader) {
      userFieldItems.push({ id: 'reports', label: '考勤记录', icon: BarChart3 });
      if (permissionSettings.allowLeaderBroadcast) {
        userFieldItems.push({ id: 'announcements', label: '发布公告', icon: Megaphone });
      }
    }

    sidebarSections.push({
      title: '工作台',
      items: [
        { id: 'dashboard', label: '我的主页', icon: Home }
      ]
    });

    if (userFieldItems.length > 0) {
      sidebarSections.push({
        title: '现场管理',
        items: userFieldItems
      });
    }
  }

  // Symmetrical Top Navigation items list for mobile drawer compatibility
  const mobileNavigationItems: { id: string; label: string; icon: any; subTab?: 'DASHBOARD' | 'MASTER_LIST' | 'ONSITE' }[] = [];
  sidebarSections.forEach(sec => {
    sec.items.forEach(it => {
      mobileNavigationItems.push(it);
    });
  });

  const { parent: bParent, current: bCurrent, title: headerTitle, desc: headerDesc } = getBreadcrumbsAndTitle();

  function getBreadcrumbsAndTitle() {
    if (session?.role === 'ADMIN') {
      switch (activeTab) {
        case 'dashboard':
          return { parent: '工作台', current: '主页', title: '数据控制中心', desc: '实时监控现场签到与打卡数据状态' };
        case 'training_checkin':
          if (trainingCheckinSubTab === 'DASHBOARD') {
            return { parent: '人员与报名', current: '报名数据', title: '报名分析看板', desc: '活动报名数据统计与签到流向' };
          } else if (trainingCheckinSubTab === 'MASTER_LIST') {
            return { parent: '人员与报名', current: '汇总名单', title: '汇总名单管理', desc: '所有预登记报名人员主数据库' };
          } else {
            return { parent: '人员与报名', current: '现场报名', title: '现场报名登记', desc: '展会现场临时到场人员快速登记' };
          }
        case 'outsourced':
          return { parent: '人员与报名', current: '分组与编外', title: '分组与编外人员管理', desc: '对在职人员进行排班与划分组别' };
        case 'checkin_system':
          return { parent: '现场管理', current: '现场签到', title: '现场签到核销', desc: '支持摄像头自动扫描二维码与手动快速签到' };
        case 'reports':
          return { parent: '现场管理', current: '考勤报表', title: '员工出勤报表', desc: '导出打卡日志及考勤异常分析' };
        case 'announcements':
          return { parent: '系统管理', current: '公告通知', title: '公告通知管理', desc: '向特定小组或全体员工发布最新公告' };
        case 'settings':
          return { parent: '系统管理', current: '系统设置', title: '系统设置', desc: '配置系统参数、基础规则和管理员账号' };
        default:
          return { parent: '工作台', current: '系统', title: '管理后台', desc: 'STAFF SYSTEM 现场调度系统' };
      }
    } else {
      switch (activeTab) {
        case 'dashboard':
          return { parent: '工作台', current: '我的主页', title: '我的工作台', desc: '日常拍照打卡、所属小组和系统公告' };
        case 'checkin_system':
          return { parent: '现场管理', current: '现场签到', title: '核销工作台', desc: '扫描二维码进行签到登记' };
        case 'reports':
          return { parent: '现场管理', current: '考勤记录', title: '小组考勤管理', desc: '查看本组组员的每日考勤数据与异常' };
        case 'announcements':
          return { parent: '系统管理', current: '发布公告', title: '小组公告发布', desc: '向当前管理的组员广播重要通知' };
        default:
          return { parent: '工作台', current: '主页', title: '我的工作台', desc: 'STAFF SYSTEM 考勤后台' };
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F5F9FF] text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-600">
      
      {/* 🚀 FIXED LEFT SIDEBAR (Desktop Only) */}
      {!isFullScreen && (
        <aside className="hidden lg:flex flex-col w-[240px] border-r border-[#E5EEF8] bg-white shrink-0 h-screen sticky top-0 z-40">
          
          {/* Logo Brand Identity */}
          <div className="p-5 border-b border-[#E5EEF8] flex flex-col gap-1.5 select-none shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#1677FF] rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/20">
                <Users size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-black text-[#102A43] tracking-tight leading-none">STAFF SYSTEM</h1>
                <p className="text-[10px] text-[#7B93AA] font-bold tracking-wide mt-1">现场调度 · 报名核销 · 考勤管理</p>
              </div>
            </div>
          </div>

          {/* Navigation Items grouped by sections */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {sidebarSections.map(sec => (
              <div key={sec.title} className="space-y-1">
                <h3 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2 px-3">{sec.title}</h3>
                <nav className="space-y-0.5">
                  {sec.items.map(item => {
                    const Icon = item.icon;
                    // Active check: matches both tab id, and sub-tab if specified
                    const isTabMatch = activeTab === item.id;
                    const isSubMatch = !item.subTab || trainingCheckinSubTab === item.subTab;
                    const isActive = isTabMatch && isSubMatch;

                    return (
                      <button
                        key={`${item.id}-${item.subTab || 'none'}`}
                        onClick={() => {
                          setActiveTab(item.id);
                          if (item.subTab) {
                            setTrainingCheckinSubTab(item.subTab);
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl font-bold text-xs transition-all border border-transparent cursor-pointer ${
                          isActive
                            ? 'bg-[#E8F3FF] text-[#1677FF] shadow-sm'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Icon size={14} className={isActive ? 'text-[#1677FF]' : 'text-slate-400'} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          {/* Bottom user profile action block */}
          <div className="p-4 border-t border-[#E5EEF8] shrink-0 bg-[#F8FAFC]">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs font-bold text-slate-800 truncate">{session?.staff?.name || '管理员'}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                  {session?.role === 'ADMIN' ? '系统管理员' : (session?.staff?.roles[0]?.groupName || '员工')}
                </p>
              </div>
              <button 
                onClick={handleLogout}
                title="安全登出"
                className="text-slate-400 hover:text-red-500 hover:bg-rose-50 p-2 rounded-xl border border-transparent hover:border-rose-100 transition-all flex items-center justify-center shrink-0 cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 🚀 MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        
        {/* TOP TOOLBAR (Always present except fullscreen) */}
        {!isFullScreen && (
          <header className="h-16 border-b border-[#E5EEF8] bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6 shrink-0">
            
            {/* Breadcrumbs and Title Info */}
            <div className="flex items-center gap-4">
              {/* Desktop Breadcrumbs and Details */}
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5 text-xs text-[#7B93AA] font-semibold">
                  <span>{bParent}</span>
                  <span>/</span>
                  <span className="text-[#1677FF]">{bCurrent}</span>
                </div>
                <h2 className="text-sm font-bold text-[#102A43] mt-0.5 flex items-center gap-2">
                  {headerTitle}
                  <span className="text-[10px] font-normal text-slate-400 font-sans">
                    {headerDesc}
                  </span>
                </h2>
              </div>
              {/* Mobile Identity */}
              <div className="sm:hidden flex items-center gap-2">
                <div className="w-7 h-7 bg-[#1677FF] rounded-lg flex items-center justify-center shadow-sm">
                  <Users size={14} className="text-white" />
                </div>
                <h1 className="text-xs font-black text-[#102A43]">{bCurrent}</h1>
              </div>
            </div>

            {/* Profile Information & Hamburger Trigger */}
            <div className="flex items-center gap-4">
              {/* User Metadata */}
              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-xs font-bold text-slate-800 leading-none mb-1">{session?.staff?.name || '管理员'}</span>
                <span className="text-[10px] text-slate-500 font-bold bg-[#F0F4F8] border border-slate-200/40 px-2 py-0.5 rounded">
                  {session?.role === 'ADMIN' ? '系统管理员' : (session?.staff?.roles[0]?.groupName || '在职员工')}
                </span>
              </div>

              {/* Mobile Menu Toggle Button */}
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)} 
                className="lg:hidden text-slate-600 p-2 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer flex items-center justify-center"
              >
                {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>
          </header>
        )}

        {/* MOBILE DRAWER OVERLAY */}
        {!isFullScreen && sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px]" 
              onClick={() => setSidebarOpen(false)}
            />
            
            {/* Drawer Drawer */}
            <div className="relative flex flex-col w-[260px] max-w-[260px] bg-white h-full shadow-2xl p-4 animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5EEF8]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#1677FF] rounded-lg flex items-center justify-center">
                    <Users size={14} className="text-white" />
                  </div>
                  <span className="text-xs font-black text-[#102A43]">STAFF SYSTEM</span>
                </div>
                <button 
                  onClick={() => setSidebarOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4">
                {sidebarSections.map(sec => (
                  <div key={sec.title} className="space-y-1">
                    <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-2">{sec.title}</h3>
                    <nav className="space-y-0.5">
                      {sec.items.map(item => {
                        const Icon = item.icon;
                        const isTabMatch = activeTab === item.id;
                        const isSubMatch = !item.subTab || trainingCheckinSubTab === item.subTab;
                        const isActive = isTabMatch && isSubMatch;

                        return (
                          <button 
                            key={`${item.id}-${item.subTab || 'none'}`}
                            onClick={() => { 
                              setActiveTab(item.id); 
                              if (item.subTab) {
                                setTrainingCheckinSubTab(item.subTab);
                              }
                              setSidebarOpen(false); 
                            }} 
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                              isActive 
                                ? 'bg-[#E8F3FF] text-[#1677FF]' 
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <Icon size={14} className={isActive ? 'text-[#1677FF]' : 'text-slate-400'} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#E5EEF8] flex items-center justify-between">
                <div className="text-xs">
                  <p className="font-bold text-slate-800">{session?.staff?.name || '管理员'}</p>
                  <p className="text-slate-400 text-[10px]">{session?.role === 'ADMIN' ? '系统管理员' : (session?.staff?.roles[0]?.groupName || '在职员工')}</p>
                </div>
                <button 
                  onClick={() => { handleLogout(); setSidebarOpen(false); }} 
                  className="text-[10px] text-red-500 font-bold bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <LogOut size={12} /> 退出
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN BODY VIEWPORT */}
        <main className={`flex-1 flex flex-col w-full min-h-0 relative z-10 ${isFullScreen ? 'p-0' : 'p-6'}`}>
          <div className={`${isFullScreen ? 'w-full h-full' : 'max-w-[1360px] w-full mx-auto'} flex-1 animate-in fade-in duration-200`}>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
