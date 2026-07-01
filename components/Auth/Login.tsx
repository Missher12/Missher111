import React, { useState, useEffect, useMemo } from 'react';
import { User, Lock, ArrowRight, Smartphone, CreditCard, AlertCircle, Zap, Briefcase, UserCheck, ShieldCheck, X } from 'lucide-react';
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
         triggerError('请填写您的个人信息');
         return;
      }

      // Direct Match
      const matchedReg = registrationList.find(r => r.name === name && r.phone === phone);
      
      if (!matchedReg) {
         triggerError('未找到该报名的核对名单。请确认姓名、手机号输入正确且已经导入汇总名单中。');
         return;
      }

      // If matched, verify ID suffix if it exists in the sheet
      if (matchedReg.idCard) {
         const suffix = matchedReg.idCard.slice(-6);
         if (suffix !== idCardSuffix) {
            triggerError('身份信息核对失败 (身份证后6位不符)。请输入正确的身份后6位！');
            return;
         }
      }

      // Check status: If REJECTED, show Status Feedback View
      if (matchedReg.isTalent === false && matchedReg.managementNotes === 'REJECTED') {
         setLoginStatusView('REJECTED');
         return;
      }

      // Success
      onLogin(matchedReg.id, 'USER');
    }
  };

  const resetForm = () => {
    setLoginStatusView('NORMAL');
    setFormData({
      name: '',
      phone: '',
      idCardSuffix: '',
      adminUser: '',
      adminPass: '',
      captchaInput: ''
    });
    setError('');
    setShowErrorModal(false);
  };

  if (loginStatusView === 'REJECTED') {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-6 font-sans">
         <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-8 border border-[#E5EEF8]/80 flex flex-col items-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6">
               <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-extrabold text-[#102A43] mb-2 text-center">审核未通过</h2>
            <p className="text-slate-400 text-sm mb-6 text-center leading-relaxed">非常抱歉，您暂时不符合录用标准。</p>
            <button onClick={resetForm} className="w-full py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-sm">返回</button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans selection:bg-blue-50 selection:text-[#1677FF]">
      
      {/* Error Modal Overlay */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-6 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-xs rounded-3xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200 relative border border-[#E5EEF8]">
              <button onClick={() => setShowErrorModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-full">
                 <X size={16} />
              </button>
              <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
                 <AlertCircle size={28} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-base mb-2">提示信息</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">{error}</p>
              <button 
                onClick={() => setShowErrorModal(false)}
                className="w-full bg-[#1677FF] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#0B5FCC] transition-all shadow-sm shadow-blue-100"
              >
                 我知道了
              </button>
           </div>
        </div>
      )}

      {/* LEFT (Desktop Only): Clean Visuals */}
      <div className="hidden lg:flex w-[45%] relative items-end justify-start bg-slate-950 overflow-hidden shadow-2xl z-10 transition-all duration-700 ease-in-out p-12">
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
               <div className="w-full h-full bg-gradient-to-br from-blue-950 to-[#0B5FCC] flex items-center justify-center">
                  <div className="text-white/10"><Zap size={200} /></div>
               </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
         </div>
      </div>

      {/* RIGHT (Mobile & Desktop): Login Form */}
      <div className="w-full lg:w-[55%] flex-1 flex flex-col bg-white relative">
        
        {/* Mobile Header (Hero Image) */}
        <div className="lg:hidden h-48 w-full relative overflow-hidden shrink-0 bg-slate-900">
           {currentBgImage ? (
              <img 
                 key={activeTab}
                 src={currentBgImage} 
                 alt="Header" 
                 className="w-full h-full object-cover animate-in fade-in duration-500" 
              />
           ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-[#1677FF] flex items-center justify-center">
                 <Zap size={48} className="text-white/20" />
              </div>
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/30"></div>
           <div className="absolute bottom-0 left-0 p-6 w-full">
              <h2 className="text-3xl font-black text-slate-800 leading-none tracking-tight">
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
                 <h2 className="text-3xl font-black text-[#102A43] tracking-tight">
                    {activeTab === 'CANDIDATE' && '面试签到'}
                    {activeTab === 'EMPLOYEE' && 'STAFF/编外登录'}
                    {activeTab === 'ADMIN' && '管理后台'}
                 </h2>
                 <p className="text-slate-400 text-sm font-semibold">请选择身份并登录系统</p>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-[#E5EEF8] relative">
                 {loginConfig?.enableCandidateLogin !== false && (
                   <div className="flex-1 relative group">
                     <button 
                         onClick={() => { setActiveTab('CANDIDATE'); setError(''); }}
                         className={`w-full h-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 z-10 relative ${activeTab === 'CANDIDATE' ? 'bg-white text-[#1677FF] shadow-sm shadow-blue-50/50 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                     >
                         <UserCheck size={14} /> 面试签到
                         <span className="w-1.5 h-1.5 bg-rose-500 rounded-full ml-0.5"></span>
                     </button>
                     {/* Tooltip */}
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                         适用于：参加面试、现场签到
                         <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                     </div>
                   </div>
                 )}
                 <button 
                   onClick={() => { setActiveTab('EMPLOYEE'); setError(''); }}
                   className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 z-10 ${activeTab === 'EMPLOYEE' ? 'bg-white text-[#1677FF] shadow-sm shadow-blue-50/50 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                 >
                   <Briefcase size={14} /> STAFF/编外
                 </button>
                 <button 
                   onClick={() => { setActiveTab('ADMIN'); setError(''); }}
                   className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 z-10 ${activeTab === 'ADMIN' ? 'bg-white text-slate-800 shadow-sm shadow-blue-50/50 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                 >
                   <ShieldCheck size={14} /> 管理后台
                 </button>
              </div>

              {/* Form Area - Compact and Top Aligned */}
              <form onSubmit={handleLogin} className="space-y-1.5">
                
                {/* Container with top alignment to keep inputs close to tabs */}
                <div className="space-y-2 min-h-[160px] flex flex-col justify-start pt-1">
                   
                   {/* CANDIDATE FORM (Updated to match Employee Fields) */}
                   {activeTab === 'CANDIDATE' && (
                     <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
                         <div className="relative group">
                           <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1677FF] transition-colors" />
                           <input 
                             type="text" 
                             placeholder="真实姓名"
                             value={formData.name}
                             onChange={e => setFormData({...formData, name: e.target.value})}
                             className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100/50 outline-none transition-all text-sm font-semibold placeholder-slate-400"
                           />
                         </div>
                         <div className="relative group">
                           <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1677FF] transition-colors" />
                           <input 
                             type="tel" 
                             placeholder="手机号码"
                             value={formData.phone}
                             onChange={e => setFormData({...formData, phone: e.target.value})}
                             className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100/50 outline-none transition-all text-sm font-semibold placeholder-slate-400"
                           />
                         </div>
                         <div className="relative group">
                           <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1677FF] transition-colors" />
                           <input 
                             type="text" 
                             maxLength={6}
                             placeholder="身份证后6位 (身份核验)"
                             value={formData.idCardSuffix}
                             onChange={e => setFormData({...formData, idCardSuffix: e.target.value})}
                             className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100/50 outline-none transition-all text-sm font-semibold placeholder-slate-400"
                           />
                         </div>
                     </div>
                   )}

                   {/* EMPLOYEE FORM */}
                   {activeTab === 'EMPLOYEE' && (
                     <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
                         <div className="relative group">
                           <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1677FF] transition-colors" />
                           <input 
                             type="text" 
                             placeholder="真实姓名"
                             value={formData.name}
                             onChange={e => setFormData({...formData, name: e.target.value})}
                             className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100/50 outline-none transition-all text-sm font-semibold placeholder-slate-400"
                           />
                         </div>
                         <div className="relative group">
                           <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1677FF] transition-colors" />
                           <input 
                             type="tel" 
                             placeholder="手机号码"
                             value={formData.phone}
                             onChange={e => setFormData({...formData, phone: e.target.value})}
                             className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100/50 outline-none transition-all text-sm font-semibold placeholder-slate-400"
                           />
                         </div>
                         <div className="relative group">
                           <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1677FF] transition-colors" />
                           <input 
                             type="text" 
                             maxLength={6}
                             placeholder="身份证后6位 (安全校验)"
                             value={formData.idCardSuffix}
                             onChange={e => setFormData({...formData, idCardSuffix: e.target.value})}
                             className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100/50 outline-none transition-all text-sm font-semibold placeholder-slate-400"
                           />
                         </div>
                     </div>
                   )}

                   {/* ADMIN FORM */}
                   {activeTab === 'ADMIN' && (
                     <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
                         <div className="relative group">
                           <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
                           <input 
                             type="text" 
                             placeholder="管理员账号"
                             value={formData.adminUser}
                             onChange={e => setFormData({...formData, adminUser: e.target.value})}
                             className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-slate-300 focus:ring-0 outline-none transition-all text-sm font-semibold"
                           />
                         </div>
                         <div className="relative group">
                           <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
                           <input 
                             type="password" 
                             placeholder="密码"
                             value={formData.adminPass}
                             onChange={e => setFormData({...formData, adminPass: e.target.value})}
                             className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-slate-300 focus:ring-0 outline-none transition-all text-sm font-semibold"
                           />
                         </div>
                         <div className="flex gap-2">
                           <input 
                               type="text"
                               maxLength={4}
                               placeholder="验证码"
                               value={formData.captchaInput}
                               onChange={e => setFormData({...formData, captchaInput: e.target.value})}
                               className="flex-1 px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-slate-300 outline-none transition-all text-sm font-semibold text-center uppercase"
                           />
                           <div 
                             onClick={generateCaptcha}
                             className="w-32 bg-slate-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group hover:bg-slate-200 transition-colors border border-transparent"
                           >
                               <span className="font-bold text-slate-600 text-lg tracking-widest z-10">{captchaCode}</span>
                               <div className="absolute bottom-0 left-0 h-1 bg-sky-400 transition-all duration-1000 ease-linear opacity-50" style={{ width: `${(countdown/60)*100}%` }}></div>
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
                       ? 'bg-[#102A43] hover:bg-slate-800 shadow-slate-200' 
                       : 'bg-[#1677FF] hover:bg-[#0B5FCC] shadow-blue-100/20'}
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
