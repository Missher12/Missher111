
import React, { useState } from 'react';
import { User, Lock, ArrowRight, Frown, Info, KeyRound } from 'lucide-react';
import { Staff } from '../types';

interface LoginProps {
  staffList: Staff[];
  onLogin: (userId: string, role: 'ADMIN' | 'USER') => void;
}

const Login: React.FC<LoginProps> = ({ staffList, onLogin }) => {
  // Unified Form State
  const [formData, setFormData] = useState({
    identifier: '', // Can be Admin Username OR Staff Name
    credential: ''  // Can be Admin Password OR Staff ID Card
  });
  const [error, setError] = useState('');
  
  // New States for Special Status Feedback
  const [loginStatusView, setLoginStatusView] = useState<'NORMAL' | 'REJECTED' | 'WAITING_GROUP'>('NORMAL');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginStatusView('NORMAL');

    const { identifier, credential } = formData;

    // 1. Check if it's Admin
    if (identifier === 'admin' && credential === 'password') {
      onLogin('admin', 'ADMIN');
      return;
    }

    // 2. Check if it's Staff (Name + ID Card)
    // Note: In a real app, this should be more strict or use unique IDs. 
    // Here we match Name AND ID Card.
    const staff = staffList.find(s => s.name === identifier && s.idCard === credential);
    
    if (staff) {
      // Logic Gate for Staff Status
      if (staff.status === 'REJECTED') {
        setLoginStatusView('REJECTED');
        return;
      }

      if (staff.status === 'INTERVIEWED' && staff.roles.length === 0) {
        setLoginStatusView('WAITING_GROUP');
        return;
      }

      // PENDING goes to Interview Dashboard, ACTIVE goes to Main App
      onLogin(staff.id, 'USER');
      return;
    } 
    
    // 3. If neither matches
    setError('登录失败：账号/姓名 或 密码/身份证号 错误');
  };

  const resetForm = () => {
    setLoginStatusView('NORMAL');
    setFormData({ identifier: '', credential: '' });
    setError('');
  };

  if (loginStatusView === 'REJECTED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center animate-fade-in">
           <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <Frown size={32} className="text-gray-500" />
           </div>
           <h2 className="text-2xl font-bold text-gray-800 mb-2">面试未通过</h2>
           <p className="text-gray-600 mb-6">
             很遗憾，经综合评估，您暂时不符合该职位的录用标准。<br/>
             感谢您的参与，祝您下次努力加油！
           </p>
           <button onClick={resetForm} className="w-full py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
             返回登录
           </button>
        </div>
      </div>
    );
  }

  if (loginStatusView === 'WAITING_GROUP') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center animate-fade-in">
           <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <Info size={32} className="text-blue-600" />
           </div>
           <h2 className="text-2xl font-bold text-gray-800 mb-2">面试已通过</h2>
           <p className="text-gray-600 mb-6">
             恭喜您通过面试！<br/>
             您的入职流程正在处理中，请等待管理员为您分配组别后，再登录系统进行考勤打卡。
           </p>
           <button onClick={resetForm} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
             知道了
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">STAFF考勤后台</h1>
          <p className="text-blue-100">内部人员管理系统</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">账号 / 姓名</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                required
                placeholder="管理员账号 或 员工真实姓名"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.identifier}
                onChange={e => setFormData({...formData, identifier: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">密码 / 身份证号</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="password"
                required
                placeholder="管理员密码 或 员工身份证号"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.credential}
                onChange={e => setFormData({...formData, credential: e.target.value})}
              />
            </div>
            <div className="text-xs text-gray-400 mt-2 space-y-1 bg-gray-50 p-2 rounded border border-gray-100">
                <p>管理员: admin / password</p>
                <p>员工示例: 李明 / 1001</p>
                <p>面试通过: 张三 / 2023</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            登录系统 <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
