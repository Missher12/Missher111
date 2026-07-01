
import React, { useState, useEffect, useMemo } from 'react';
import { User, Lock, ArrowRight, Smartphone, CreditCard, AlertCircle, Zap, Briefcase, UserCheck, ShieldCheck, X, Sparkles, HelpCircle } from 'lucide-react';
import { AdminUser, Staff, LoginConfig, RegistrationRecord } from '../../types';

interface LoginProps {
  staffList: Staff[];
  registrationList: RegistrationRecord[];
  onLogin: (userId: string, role: 'ADMIN' | 'USER') => void;
  adminUsers: AdminUser[];
  loginConfig?: LoginConfig;
  defaultTab?: 'CANDIDATE' | 'EMPLOYEE' | 'ADMIN';
}

type LoginTab = 'CANDIDATE' | 'EMPLOYEE' | 'ADMIN';

const Login: React.FC<LoginProps> = ({ staffList, registrationList, onLogin, adminUsers, loginConfig, defaultTab = 'CANDIDATE' }) => {
  // Login Mode State
  const [activeTab, setActiveTab] = useState<LoginTab>(defaultTab);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    idCardSuffix: '', // Last 6 digits
    adminUser: '',
    adminPass: '',
    captchaInput: ''
  });
  
  const [captchaCode, setCaptchaCode] = useState('');
  const [countdown, setCountdown] = useState(60); 
  const [error, setError] = useState(''); // Error message content
  const [showErrorModal, setShowErrorModal] = useState(false); // Modal visibility
  const [loading, setLoading] = useState(false);
  
  // Status Feedback View
  const [loginStatusView, setLoginStatusView] = useState<'NORMAL' | 'REJECTED'>('NORMAL');

  // Determine Current Background Image
  const currentBgImage = useMemo(() => {
    switch(activeTab) {
        case 'CANDIDATE': return loginConfig?.candidateBg || loginConfig?.imageUrl;
        case 'EMPLOYEE': return loginConfig?.staffBg || loginConfig?.imageUrl;
        case 'ADMIN': return loginConfig?.adminBg || loginConfig?.imageUrl;
        default: return loginConfig?.imageUrl;
    }
  }, [activeTab, loginConfig]);

  // Initial Tab Logic (Respect config)
  useEffect(() => {
    if (loginConfig?.enableCandidateLogin === false && activeTab === 'CANDIDATE') {
      setActiveTab('EMPLOYEE');
    }
  }, [loginConfig, activeTab]);

  // Generate Captcha
  const generateCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(result);
    setCountdown(60); 
  };

  // Initial Captcha & Auto Refresh Timer (60s)
  useEffect(() => {
    generateCaptcha();
    const interval = setInterval(() => generateCaptcha(), 60000);
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 60));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, []);

  // Helper to show error
  const triggerError = (msg: string) => {
    setError(msg);
    setShowErrorModal(true);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowErrorModal(false);
    
    setLoading(true);
    setTimeout(() => {
        setLoading(false);
        processLogin();
    }, 600);
  };

  const processLogin = () => {
    setLoginStatusView('NORMAL');

    // 1. ADMIN LOGIN
    if (activeTab === 'ADMIN') {
      if (formData.captchaInput.toUpperCase() !== captchaCode) {
         triggerError('验证码错误，请重新输入');
         generateCaptcha();
         setFormData(prev => ({...prev, captchaInput: ''}));
         return;
      }
      const admin = adminUsers.find(u => u.username === formData.adminUser && u.password === formData.adminPass);
      if (admin) {
        onLogin(admin.username, 'ADMIN');
      } else {
        triggerError('账号或密码错误');
        generateCaptcha();
      }
      return;
    }

    const { name, phone, idCardSuffix } = formData;

    // 2. EMPLOYEE LOGIN (Formal Staff)
    if (activeTab === 'EMPLOYEE') {
      if (!name || !phone || !idCardSuffix) {
         triggerError('请补全姓名、手机号及身份证后6位');
         return;
      }

      // Search in staffList only for ACTIVE members
      const staff = staffList.find(s => s.name === name && s.phone === phone);
      
      if (!staff) {
         // Check if they might be a candidate trying to login here
         const isCandidate = registrationList.some(r => r.name === name && r.phone === phone);
         if (isCandidate) {
            triggerError('您尚未办理入职，请切换至【面试签到】页签登录');
         } else {
            triggerError('未找到员工记录，请检查输入');
         }
         return;
      }

      if (staff.status !== 'ACTIVE') {
         triggerError('您的账号状态非正式员工，请联系管理员');
         return;
      }

      const actualIdSuffix = staff.idCard ? staff.idCard.slice(-6) : '';
      if (actualIdSuffix !== idCardSuffix) {
         triggerError('身份验证失败 (身份证后6位不匹配)');
         return;
      }

      onLogin(staff.id, 'USER');
      return;
    }

    // 3. CANDIDATE LOGIN (Interview / Check-in / Pending)
    if (activeTab === 'CANDIDATE') {
      if (!name || !phone || !idCardSuffix) {
         triggerError('请填写姓名、手机号及身份证后6位');
         return;
      }

      // Priority 1: Check Registration List
      const candidate = registrationList.find(r => r.name === name && r.phone === phone);
      if (candidate) {
         // If ID card was provided in registration, validate it (optional security)
         if (candidate.idCard) {
            if (candidate.idCard.slice(-6) !== idCardSuffix) {
               triggerError('身份验证失败 (身份证后6位不匹配)');
               return;
            }
         }
         onLogin(candidate.id, 'USER');
         return;
      }

      // Priority 2: Check Staff List (for Pending/Interviewed status who were manually added)
      const pendingStaff = staffList.find(s => s.name === name && s.phone === phone);
      if (pendingStaff) {
         if (pendingStaff.status === 'ACTIVE') {
            triggerError('您已是正式员工，请切换至【STAFF/编外】页签登录');
            return;
         }
         if (pendingStaff.idCard && pendingStaff.idCard.slice(-6) !== idCardSuffix) {
            triggerError('身份验证失败 (身份证后6位不匹配)');
            return;
         }
         if (pendingStaff.status === 'REJECTED') {
            setLoginStatusView('REJECTED');
            return;
         }
         onLogin(pendingStaff.id, 'USER');
         return;
      }

      triggerError('未找到报名记录，请确认姓名手机号是否正确');
      return;
    }
  };

  const resetForm = () => {
    setLoginStatusView('NORMAL');
    setFormData({ name: '', phone: '', idCardSuffix: '', adminUser: '', adminPass: '', captchaInput: '' });
    generateCaptcha();
    setError('');
    setShowErrorModal(false);
  };

  // --- Feedback Screens ---
  if (loginStatusView === 'REJECTED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-xs border border-gray-100 animate-in zoom-in duration-300">
           <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400 shadow-inner">
             <AlertCircle size={32} />
           </div>
           <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">审核未通过</h2>
           <p className="text-gray-400 text-sm mb-6 text-center">非常抱歉，您暂时不符合录用标准。</p>
           <button onClick={resetForm} className="w-full py-3 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors text-sm">返回</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans selection:bg-indigo-100 selection:text-indigo-600">
      
      {/* Error Modal Overlay */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-6 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-xs rounded-3xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200 relative">
              <button onClick={() => setShowErrorModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1">
                 <X size={20} />
              </button>
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                 <AlertCircle size={28} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">登录提示</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed px-2">{error}</p>
              <button 
                onClick={() => setShowErrorModal(false)}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors"
              >
                 知道了
              </button>
           </div>
        </div>
      )}

      {/* LEFT (Desktop Only): Clean Visuals */}
      <div className="hidden lg:flex w-[45%] relative items-end justify-start bg-gray-900 overflow-hidden shadow-2xl z-10 transition-all duration-700 ease-in-out p-12">
         {/* Background Image Layer with Transition */}
         <div className="absolute inset-0 z-0">
            {currentBgImage ? (
               <img 
                 key={activeTab} // Key forces re-render for transition
                 src={currentBgImage} 
                 alt="Cover" 
                 className="w-full h-full object-cover animate-in fade-in duration-700" 
               />
            ) : (
               <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center">
                  <div className="text-white/10"><Zap size={200} /></div>
               </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
         </div>
      </div>

      {/* RIGHT (Mobile & Desktop): Login Form */}
      <div className="w-full lg:w-[55%] flex-1 flex flex-col bg-white relative">
        
        {/* Mobile Header (Hero Image) */}
        <div className="lg:hidden h-48 w-full relative overflow-hidden shrink-0 bg-gray-900">
           {currentBgImage ? (
              <img 
                 key={activeTab}
                 src={currentBgImage} 
                 alt="Header" 
                 className="w-full h-full object-cover animate-in fade-in duration-500" 
              />
           ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
                 <Zap size={48} className="text-white/20" />
              </div>
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/30"></div>
           <div className="absolute bottom-0 left-0 p-6 w-full">
              <h2 className="text-3xl font-black text-gray-800 leading-none tracking-tight">
                 {activeTab === 'CANDIDATE' && '面试签到'}
                 {activeTab === 'EMPLOYEE' && 'STAFF/编外登录'}
                 {activeTab === 'ADMIN' && '管理后台'}
              </h2>
           </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
           {/* Compact Layout Container */}
           <div className="w-full max-w-sm space-y-4 animate-in slide-in-from-bottom-4 duration-500">
             
             {/* Desktop Header (Only visible on lg screens) */}
             <div className="text-center space-y-1 hidden lg:block mb-6">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                   {activeTab === 'CANDIDATE' && '面试签到'}
                   {activeTab === 'EMPLOYEE' && 'STAFF/编外登录'}
                   {activeTab === 'ADMIN' && '管理后台'}
                </h2>
                <p className="text-gray-400 text-sm font-medium">请选择身份并登录系统</p>
             </div>

             {/* Tab Selector */}
             <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 relative">
                {loginConfig?.enableCandidateLogin !== false && (
                  <div className="flex-1 relative group">
                    <button 
                        onClick={() => { setActiveTab('CANDIDATE'); setError(''); }}
                        className={`w-full h-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 z-10 relative ${activeTab === 'CANDIDATE' ? 'bg-white text-indigo-600 shadow-md shadow-gray-200 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                    >
                        <UserCheck size={14} /> 面试签到
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full ml-0.5"></span>
                    </button>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-gray-800 text-white text-[10px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                        适用于：参加面试、现场签到
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => { setActiveTab('EMPLOYEE'); setError(''); }}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 z-10 ${activeTab === 'EMPLOYEE' ? 'bg-white text-indigo-600 shadow-md shadow-gray-200 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                >
                  <Briefcase size={14} /> STAFF/编外
                </button>
                <button 
                  onClick={() => { setActiveTab('ADMIN'); setError(''); }}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 z-10 ${activeTab === 'ADMIN' ? 'bg-white text-gray-900 shadow-md shadow-gray-200 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                >
                  <ShieldCheck size={14} /> 管理后台
                </button>
             </div>

             {/* Form Area - Compact and Top Aligned */}
             <form onSubmit={handleLogin} className="space-y-1.5">
               
               {/* Container with top alignment (justify-start) to keep inputs close to tabs */}
               <div className="space-y-2 min-h-[160px] flex flex-col justify-start pt-1">
                  
                  {/* CANDIDATE FORM (Updated to match Employee Fields) */}
                  {activeTab === 'CANDIDATE' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* No static info block here anymore */}
                        <div className="relative group">
                          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                          <input 
                            type="text" 
                            placeholder="真实姓名"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium placeholder-gray-400"
                          />
                        </div>
                        <div className="relative group">
                          <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                          <input 
                            type="tel" 
                            placeholder="手机号码"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium placeholder-gray-400"
                          />
                        </div>
                        <div className="relative group">
                          <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                          <input 
                            type="text" 
                            maxLength={6}
                            placeholder="身份证后6位 (身份核验)"
                            value={formData.idCardSuffix}
                            onChange={e => setFormData({...formData, idCardSuffix: e.target.value})}
                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium placeholder-gray-400"
                          />
                        </div>
                    </div>
                  )}

                  {/* EMPLOYEE FORM */}
                  {activeTab === 'EMPLOYEE' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="relative group">
                          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                          <input 
                            type="text" 
                            placeholder="真实姓名"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium placeholder-gray-400"
                          />
                        </div>
                        <div className="relative group">
                          <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                          <input 
                            type="tel" 
                            placeholder="手机号码"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium placeholder-gray-400"
                          />
                        </div>
                        <div className="relative group">
                          <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                          <input 
                            type="text" 
                            maxLength={6}
                            placeholder="身份证后6位 (安全校验)"
                            value={formData.idCardSuffix}
                            onChange={e => setFormData({...formData, idCardSuffix: e.target.value})}
                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium placeholder-gray-400"
                          />
                        </div>
                    </div>
                  )}

                  {/* ADMIN FORM */}
                  {activeTab === 'ADMIN' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="relative group">
                          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-800 transition-colors" />
                          <input 
                            type="text" 
                            placeholder="管理员账号"
                            value={formData.adminUser}
                            onChange={e => setFormData({...formData, adminUser: e.target.value})}
                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-gray-300 focus:ring-0 outline-none transition-all text-sm font-medium"
                          />
                        </div>
                        <div className="relative group">
                          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-800 transition-colors" />
                          <input 
                            type="password" 
                            placeholder="密码"
                            value={formData.adminPass}
                            onChange={e => setFormData({...formData, adminPass: e.target.value})}
                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-gray-300 focus:ring-0 outline-none transition-all text-sm font-medium"
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                              type="text"
                              maxLength={4}
                              placeholder="验证码"
                              value={formData.captchaInput}
                              onChange={e => setFormData({...formData, captchaInput: e.target.value})}
                              className="flex-1 px-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-gray-300 outline-none transition-all text-sm font-medium text-center uppercase"
                          />
                          <div 
                            onClick={generateCaptcha}
                            className="w-32 bg-gray-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group hover:bg-gray-200 transition-colors border border-transparent"
                          >
                              <span className="font-mono font-bold text-gray-600 text-lg tracking-widest z-10">{captchaCode}</span>
                              <div className="absolute bottom-0 left-0 h-1 bg-indigo-400 transition-all duration-1000 ease-linear opacity-50" style={{ width: `${(countdown/60)*100}%` }}></div>
                          </div>
                        </div>
                    </div>
                  )}
               </div>

               <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 rounded-2xl font-bold text-base text-white shadow-xl flex items-center justify-center gap-2 transform active:scale-95 transition-all
                    ${activeTab === 'ADMIN' 
                      ? 'bg-gray-900 hover:bg-black shadow-gray-200' 
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}
                  `}
               >
                  {loading ? (
                    <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> 验证中...</span>
                  ) : (
                    <>
                      {activeTab === 'ADMIN' ? '进入后台' : '立即登录'} <ArrowRight size={18} />
                    </>
                  )}
               </button>
             </form>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
