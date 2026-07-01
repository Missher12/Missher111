import React, { useState } from 'react';
import { Settings, Globe, Check, Server, Clock, Shield, Users, Plus, Trash2, Lock, User, Layout, Image as ImageIcon, Hash, Key, X } from 'lucide-react';
import { AttendanceConfig, PermissionSettings, AdminUser, LoginConfig, RegistrationConfig } from '../../types';
import { Toast } from '../ui/Kit';

interface SystemSettingsProps {
  onSave: (settings: { domain: string; attendance: AttendanceConfig; permissions: PermissionSettings; loginConfig: LoginConfig; registrationConfig: RegistrationConfig }) => void;
  initialDomain: string;
  initialAttendanceConfig: AttendanceConfig;
  initialPermissionSettings: PermissionSettings;
  initialLoginConfig: LoginConfig;
  initialRegistrationConfig: RegistrationConfig;
  adminUsers: AdminUser[];
  onAddAdmin: (user: AdminUser) => boolean;
  onDeleteAdmin: (username: string) => void;
  onUpdateAdminPassword: (username: string, newPass: string) => void;
}

const SettingsToggle: React.FC<{
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}> = ({ label, description, enabled, onToggle }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-[#E5EEF8] hover:bg-white transition-all duration-300">
    <div>
      <h4 className="font-bold text-slate-800 text-sm">{label}</h4>
      <p className="text-xs text-slate-400 mt-1">{description}</p>
    </div>
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-100 focus:ring-offset-2 ${
        enabled ? 'bg-[#1677FF]' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const SystemSettings: React.FC<SystemSettingsProps> = ({ 
  onSave, 
  initialDomain, 
  initialAttendanceConfig, 
  initialPermissionSettings,
  initialLoginConfig,
  initialRegistrationConfig,
  adminUsers,
  onAddAdmin,
  onDeleteAdmin,
  onUpdateAdminPassword
}) => {
  const [activeTab, setActiveTab] = useState('PERMISSIONS');
  const [domain, setDomain] = useState(initialDomain);
  const [attendanceConfig, setAttendanceConfig] = useState<AttendanceConfig>(initialAttendanceConfig);
  const [permissions, setPermissions] = useState<PermissionSettings>(initialPermissionSettings);
  const [loginConfig, setLoginConfig] = useState<LoginConfig>(initialLoginConfig);
  const [registrationConfig, setRegistrationConfig] = useState<RegistrationConfig>(initialRegistrationConfig || { masterPrefix: 'M', onSitePrefix: 'S' });
  const [saved, setSaved] = useState(false);

  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  
  // Password Change Modal State
  const [passwordEditUser, setPasswordEditUser] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('error');

  const handleSave = () => {
    let cleanDomain = domain.trim();
    if (cleanDomain.endsWith('/')) {
        cleanDomain = cleanDomain.slice(0, -1);
    }
    onSave({ 
      domain: cleanDomain,
      attendance: attendanceConfig,
      permissions: permissions,
      loginConfig: loginConfig,
      registrationConfig: registrationConfig
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdmin.username && newAdmin.password) {
      const success = onAddAdmin(newAdmin);
      if (success) {
        setNewAdmin({ username: '', password: '' });
        setToastType('success');
        setToastMsg('成功添加管理员账号');
      } else {
        setToastType('error');
        setToastMsg('添加管理员账号失败，可能用户名已存在');
      }
    } else {
      setToastType('error');
      setToastMsg('请输入用户名和密码');
    }
  };

  const handleChangePasswordSubmit = () => {
    if (passwordEditUser && newPasswordInput) {
      onUpdateAdminPassword(passwordEditUser, newPasswordInput);
      setPasswordEditUser(null);
      setNewPasswordInput('');
      setToastType('success');
      setToastMsg('密码修改成功');
    } else {
      setToastType('error');
      setToastMsg('请输入新密码');
    }
  };

  const handleImageUpload = (key: 'imageUrl' | 'logoUrl' | 'candidateBg' | 'staffBg' | 'adminBg', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLoginConfig(prev => ({ ...prev, [key]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const TABS = [
    { id: 'PERMISSIONS', label: '角色权限', icon: Shield },
    { id: 'LOGIN', label: '登录配置', icon: Layout },
    { id: 'REGISTRATION', label: '编号规则', icon: Hash },
    { id: 'ADMINS', label: '管理员账户', icon: Users },
    { id: 'ATTENDANCE', label: '考勤规则', icon: Clock },
    { id: 'DOMAIN', label: '访问域名', icon: Globe },
  ];

  const ImageUploader = ({ label, value, uploadKey, height = 'h-48' }: { label: string, value?: string, uploadKey: any, height?: string }) => (
    <div className="flex-1">
        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
        <div className={`border-2 border-dashed border-slate-200/80 rounded-2xl p-4 text-center hover:bg-slate-50 transition-all duration-300 relative group ${height} flex items-center justify-center cursor-pointer`}>
        {value ? (
            <div className="relative w-full h-full rounded-xl overflow-hidden shadow-sm">
                <img src={value} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setLoginConfig({...loginConfig, [uploadKey]: ''})}
                  className="absolute top-2 right-2 bg-rose-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  title="移除图片"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center text-slate-400">
                <ImageIcon size={32} className="mb-2 opacity-20 text-[#1677FF]" />
                <p className="text-xs font-semibold">点击上传图片</p>
            </div>
        )}
        <input 
            type="file" 
            accept="image/*" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            onChange={(e) => handleImageUpload(uploadKey, e)}
        />
        </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-24 w-full">
      <div className="flex items-center gap-2.5">
         <div className="p-2.5 bg-blue-50 rounded-xl text-[#1677FF]">
            <Settings size={20} />
         </div>
         <div>
            <h1 className="text-lg font-extrabold text-[#0c2f42]">系统设置</h1>
            <p className="text-xs text-slate-400">配置系统的全局参数、考勤规则与角色权限</p>
         </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-[#E5EEF8]/80 flex items-center gap-1.5 flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all min-w-[100px] ${
                activeTab === tab.id ? 'bg-blue-50 text-[#1677FF] shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Permissions Settings */}
      {activeTab === 'PERMISSIONS' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5EEF8]/80 p-6 md:p-8 animate-fade-in">
           <h2 className="text-base font-extrabold text-[#0c2f42] mb-6 flex items-center gap-2 pb-4 border-b border-slate-50">
              <Shield size={18} className="text-[#1677FF]" /> 角色权限配置
           </h2>
           <div className="space-y-4">
             <SettingsToggle
               label="开启现场签到功能"
               description="开启后，管理员和授权人员（编外/服务组）可使用扫码核销功能。关闭则隐藏此模块。"
               enabled={permissions.enableCheckIn}
               onToggle={() => setPermissions(p => ({...p, enableCheckIn: !p.enableCheckIn}))}
             />
             <SettingsToggle
               label="允许组长导出考勤报表"
               description="开启后，组长可以在考勤报表页面看到并使用“导出”功能。"
               enabled={permissions.allowLeaderExport}
               onToggle={() => setPermissions(p => ({...p, allowLeaderExport: !p.allowLeaderExport}))}
             />
             <SettingsToggle
               label="允许组长发布组内公告"
               description="开启后，组长可以向其所在的小组发布通知公告。"
               enabled={permissions.allowLeaderBroadcast}
               onToggle={() => setPermissions(p => ({...p, allowLeaderBroadcast: !p.allowLeaderBroadcast}))}
             />
             <SettingsToggle
               label="显示敏感信息"
               description="开启后，在报表、详情等页面将完整显示手机号、身份证号。关闭则自动脱敏处理。"
               enabled={permissions.showSensitiveInfo}
               onToggle={() => setPermissions(p => ({...p, showSensitiveInfo: !p.showSensitiveInfo}))}
             />
             <SettingsToggle
               label="允许员工查看团队成员"
               description="（开发中）开启后，普通员工可以看到同组成员的通讯信息。"
               enabled={permissions.allowStaffViewTeam}
               onToggle={() => setPermissions(p => ({...p, allowStaffViewTeam: !p.allowStaffViewTeam}))}
             />
           </div>
        </div>
      )}

      {/* Registration Config Settings */}
      {activeTab === 'REGISTRATION' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5EEF8]/80 p-6 md:p-8 animate-fade-in">
           <h2 className="text-base font-extrabold text-[#0c2f42] mb-6 flex items-center gap-2 pb-4 border-b border-slate-50">
              <Hash size={18} className="text-[#1677FF]" /> 报名编号规则
           </h2>
           <p className="text-xs text-slate-400 mb-6 font-semibold">自定义人员编号的前缀，用于区分不同来源的报名数据。</p>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-2.5 uppercase tracking-wider">汇总名单前缀</label>
                 <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">#</div>
                    <input 
                      type="text" 
                      value={registrationConfig.masterPrefix} 
                      onChange={e => setRegistrationConfig({...registrationConfig, masterPrefix: e.target.value})}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all duration-300 uppercase font-semibold"
                      placeholder="默认: M"
                    />
                 </div>
                 <p className="text-xs text-slate-400 mt-2 font-medium">例如: <span className="bg-slate-100 px-1.5 py-0.5 rounded-md font-bold text-slate-600">{registrationConfig.masterPrefix || 'M'}00001</span></p>
              </div>
              
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-2.5 uppercase tracking-wider">现场报名前缀</label>
                 <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">#</div>
                    <input 
                      type="text" 
                      value={registrationConfig.onSitePrefix} 
                      onChange={e => setRegistrationConfig({...registrationConfig, onSitePrefix: e.target.value})}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all duration-300 uppercase font-semibold"
                      placeholder="默认: S"
                    />
                 </div>
                 <p className="text-xs text-slate-400 mt-2 font-medium">例如: <span className="bg-slate-100 px-1.5 py-0.5 rounded-md font-bold text-slate-600">{registrationConfig.onSitePrefix || 'S'}00001</span></p>
              </div>
           </div>
        </div>
      )}

      {/* Login Configuration Settings */}
      {activeTab === 'LOGIN' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5EEF8]/80 p-6 md:p-8 animate-fade-in">
           <h2 className="text-base font-extrabold text-[#0c2f42] mb-6 flex items-center gap-2 pb-4 border-b border-slate-50">
              <Layout size={18} className="text-[#1677FF]" /> 登录页个性化
           </h2>
           <div className="space-y-8">
              
              {/* Feature Toggle */}
              <div className="bg-blue-50/40 rounded-2xl p-4 border border-blue-100/40">
                 <SettingsToggle
                    label="启用面试签到入口"
                    description="在登录页显示“面试签到”选项卡。关闭后仅显示员工和管理员登录。"
                    enabled={loginConfig.enableCandidateLogin !== false}
                    onToggle={() => setLoginConfig(prev => ({...prev, enableCandidateLogin: !prev.enableCandidateLogin}))}
                 />
              </div>

              {/* Branding Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">系统标题</label>
                    <input 
                        type="text" 
                        value={loginConfig.title} 
                        onChange={e => setLoginConfig({...loginConfig, title: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-sm outline-none focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all duration-300"
                        placeholder="默认: STAFF SYSTEM"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">副标题 / Slogan</label>
                    <input 
                        type="text" 
                        value={loginConfig.subtitle} 
                        onChange={e => setLoginConfig({...loginConfig, subtitle: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-sm outline-none focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all duration-300"
                        placeholder="留空则不显示"
                    />
                  </div>
              </div>

              {/* Dynamic Role Backgrounds */}
              <div>
                  <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                      <ImageIcon size={16} className="text-[#1677FF]" /> 角色背景图配置 (三等分)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <ImageUploader label="面试/签到 背景" value={loginConfig.candidateBg} uploadKey="candidateBg" />
                      <ImageUploader label="员工/编外 背景" value={loginConfig.staffBg} uploadKey="staffBg" />
                      <ImageUploader label="管理后台 背景" value={loginConfig.adminBg} uploadKey="adminBg" />
                  </div>
                  <p className="text-xs text-slate-400 mt-2.5 font-semibold">点击Tab切换时，登录页左侧（电脑端）或顶部（手机端）将展示对应的图片。建议比例：9:16 (竖屏) 或 3:4。</p>
              </div>

              <div className="pt-6 border-t border-[#E5EEF8]">
                 <h3 className="text-sm font-extrabold text-slate-800 mb-4">通用资源</h3>
                 <div className="flex flex-col sm:flex-row gap-6">
                    <div className="w-full sm:w-48">
                        <ImageUploader label="系统图标 (Logo)" value={loginConfig.logoUrl} uploadKey="logoUrl" height="h-32" />
                    </div>
                    <div className="flex-1">
                        <ImageUploader label="默认/兜底背景图" value={loginConfig.imageUrl} uploadKey="imageUrl" height="h-32" />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Admin Accounts Settings */}
      {activeTab === 'ADMINS' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5EEF8]/80 p-6 md:p-8 animate-fade-in">
          <h2 className="text-base font-extrabold text-[#0c2f42] mb-6 flex items-center gap-2 pb-4 border-b border-slate-50">
            <Users size={18} className="text-[#1677FF]" /> 管理员账户
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Add New Admin Form */}
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm mb-4">添加新管理员</h3>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">用户名</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={newAdmin.username}
                      onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                      placeholder="设置登录名"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all duration-300 font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">密码</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                      placeholder="设置登录密码"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all duration-300 font-semibold"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#1677FF] text-white py-2.5 rounded-xl font-bold hover:bg-[#0B5FCC] transition-all flex items-center justify-center gap-2 shadow-sm shadow-blue-100/20"
                >
                  <Plus size={16} /> 添加账户
                </button>
              </form>
            </div>
            {/* Existing Admins List */}
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm mb-4">现有管理员 ({adminUsers.length})</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {adminUsers.map(user => (
                  <div key={user.username} className="flex items-center justify-between p-3 bg-slate-50 border border-[#E5EEF8] rounded-xl group hover:bg-white hover:border-blue-100 hover:shadow-sm transition-all duration-300">
                    <span className="font-bold text-slate-800 text-sm">{user.username}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => {
                          setPasswordEditUser(user.username);
                          setNewPasswordInput('');
                        }}
                        className="text-slate-400 hover:text-[#1677FF] p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        title="修改密码"
                      >
                        <Key size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteAdmin(user.username)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        title="删除账户"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Domain Settings */}
      {activeTab === 'DOMAIN' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5EEF8]/80 p-6 md:p-8 animate-fade-in">
           <h2 className="text-base font-extrabold text-[#0c2f42] mb-6 flex items-center gap-2 pb-4 border-b border-slate-50">
              <Globe size={18} className="text-[#1677FF]" /> 访问与域名配置
           </h2>
           <div className="space-y-6">
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">自定义访问域名 / IP</label>
                 <p className="text-xs text-slate-400 mb-2.5 font-semibold">用于生成表单分享链接和二维码。若部署在内网，请填写服务器局域网IP。</p>
                 <div className="flex items-center max-w-lg">
                    <div className="bg-slate-100 p-3 rounded-l-xl border border-slate-200 border-r-0 text-slate-500 shrink-0">
                       <Server size={18} />
                    </div>
                    <input 
                      type="text" 
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="例如: https://hr.mycompany.com 或 http://192.168.1.100"
                      className="w-full border border-slate-200 p-2.5 rounded-r-xl text-sm outline-none focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all duration-300 font-semibold"
                    />
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Attendance Settings */}
      {activeTab === 'ATTENDANCE' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5EEF8]/80 p-6 md:p-8 animate-fade-in">
           <h2 className="text-base font-extrabold text-[#0c2f42] mb-6 flex items-center gap-2 pb-4 border-b border-slate-50">
              <Clock size={18} className="text-[#1677FF]" /> 考勤时间规则
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">上班时间 (Start)</label>
                 <input 
                   type="time"
                   value={attendanceConfig.startTime}
                   onChange={(e) => setAttendanceConfig({...attendanceConfig, startTime: e.target.value})}
                   className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-sm outline-none focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all duration-300 font-semibold"
                 />
                 <p className="text-xs text-slate-400 mt-1.5 font-medium">在此时间后打卡记为迟到</p>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">下班时间 (End)</label>
                 <input 
                   type="time"
                   value={attendanceConfig.endTime}
                   onChange={(e) => setAttendanceConfig({...attendanceConfig, endTime: e.target.value})}
                   className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-sm outline-none focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all duration-300 font-semibold"
                 />
                 <p className="text-xs text-slate-400 mt-1.5 font-medium">在此时间前打卡记为早退</p>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">加班起始 (Overtime)</label>
                 <input 
                   type="time"
                   value={attendanceConfig.overtimeStart}
                   onChange={(e) => setAttendanceConfig({...attendanceConfig, overtimeStart: e.target.value})}
                   className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-sm outline-none focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all duration-300 font-semibold"
                 />
                 <p className="text-xs text-slate-400 mt-1.5 font-medium">在此时间后打卡记为加班</p>
              </div>
           </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            className={`px-8 py-3 rounded-xl text-white font-bold transition-all flex items-center gap-2 shadow-lg ${
              saved ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100 scale-105' : 'bg-[#1677FF] hover:bg-[#0B5FCC] shadow-blue-100/20 hover:-translate-y-0.5'
            }`}
          >
            {saved ? <Check size={20} /> : <Settings size={20} />}
            {saved ? '已保存设置' : '保存系统设置'}
          </button>
      </div>

      {/* Change Password Modal */}
      {passwordEditUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in duration-200 border border-[#E5EEF8]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-base text-slate-800">修改密码: {passwordEditUser}</h3>
              <button onClick={() => setPasswordEditUser(null)} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">新密码</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="输入新密码"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all duration-300 font-semibold"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setPasswordEditUser(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-bold text-xs transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleChangePasswordSubmit}
                  className="flex-1 py-2.5 bg-[#1677FF] text-white rounded-xl hover:bg-[#0B5FCC] font-bold text-xs transition-colors shadow-sm shadow-blue-100/20"
                >
                  确认修改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toastMsg && (
        <Toast 
          message={toastMsg} 
          type={toastType} 
          onClose={() => setToastMsg(null)} 
        />
      )}
    </div>
  );
};

export default SystemSettings;
