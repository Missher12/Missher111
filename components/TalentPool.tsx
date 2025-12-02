
import React, { useState } from 'react';
import { Staff } from '../types';
import { Star, Award, Briefcase, Phone, User, Edit3, Trash2, Search, X } from 'lucide-react';

interface TalentPoolProps {
  staffList: Staff[];
  onUpdateStaff: (staff: Staff) => void;
}

const TalentPool: React.FC<TalentPoolProps> = ({ staffList, onUpdateStaff }) => {
  const [activeTab, setActiveTab] = useState<'INTERNAL' | 'EXTERNAL'>('EXTERNAL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // INTERNAL: Status is ACTIVE
  // EXTERNAL: Status is PENDING, INTERVIEWED, or REJECTED
  const talents = staffList.filter(s => s.isTalent);

  const displayedTalents = talents.filter(t => {
    const isInternal = t.status === 'ACTIVE';
    const matchesTab = activeTab === 'INTERNAL' ? isInternal : !isInternal;
    const matchesSearch = t.name.includes(searchTerm) || t.phone?.includes(searchTerm) || t.talentNotes?.includes(searchTerm);
    return matchesTab && matchesSearch;
  });

  const handleRemove = (staff: Staff) => {
    if (confirm(`确定将 ${staff.name} 移出人才库吗？`)) {
      onUpdateStaff({ ...staff, isTalent: false });
    }
  };

  const startEdit = (staff: Staff) => {
    setEditingId(staff.id);
    setEditNote(staff.talentNotes || '');
  };

  const saveEdit = (staff: Staff) => {
    onUpdateStaff({ ...staff, talentNotes: editNote });
    setEditingId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Award className="text-yellow-500" /> 企业人才库
          </h1>
          <p className="text-gray-500 text-sm">
            管理精英员工与外部储备人才，构建企业核心竞争力
          </p>
        </div>

        <div className="flex items-center bg-gray-100 p-1 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('EXTERNAL')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'EXTERNAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User size={16} /> 外部储备 ({talents.filter(t => t.status !== 'ACTIVE').length})
          </button>
          <button
            onClick={() => setActiveTab('INTERNAL')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'INTERNAL' ? 'bg-white text-yellow-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Star size={16} /> 内部精英 ({talents.filter(t => t.status === 'ACTIVE').length})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
        <Search size={18} className="text-gray-400" />
        <input 
          type="text" 
          placeholder="搜索人才姓名、手机号或备注..." 
          className="flex-1 outline-none text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Talent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayedTalents.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
            <Award size={48} className="mx-auto mb-3 opacity-20" />
            <p>暂无{activeTab === 'INTERNAL' ? '内部精英' : '外部储备'}数据</p>
            <p className="text-xs mt-1">请在“面试管理”或“成员管理”中点击星标添加</p>
          </div>
        ) : (
          displayedTalents.map(staff => (
            <div key={staff.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative overflow-hidden">
               <div className={`h-2 w-full ${activeTab === 'INTERNAL' ? 'bg-yellow-400' : 'bg-indigo-400'}`}></div>
               <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-3">
                        <img src={staff.avatar} className="w-12 h-12 rounded-full border border-gray-100" alt={staff.name} />
                        <div>
                           <h3 className="font-bold text-gray-800">{staff.name}</h3>
                           <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                             staff.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 
                             'bg-gray-100 text-gray-600 border-gray-200'
                           }`}>
                             {staff.status === 'ACTIVE' ? '在职员工' : 
                              staff.status === 'REJECTED' ? '未录用' : 
                              staff.status === 'INTERVIEWED' ? '待定岗' : '候选人'}
                           </span>
                        </div>
                     </div>
                     <button 
                       onClick={() => handleRemove(staff)}
                       className="text-gray-300 hover:text-red-500 transition-colors p-1"
                       title="移出人才库"
                     >
                       <Trash2 size={16} />
                     </button>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    {activeTab === 'INTERNAL' && (
                       <div className="flex items-center gap-2">
                          <Briefcase size={14} className="text-gray-400" />
                          <span className="truncate">{staff.roles.map(r => r.groupName).join(', ') || '暂无分组'}</span>
                       </div>
                    )}
                    <div className="flex items-center gap-2">
                       <Phone size={14} className="text-gray-400" />
                       <span>{staff.phone || '无联系方式'}</span>
                    </div>
                  </div>

                  <div className="bg-yellow-50/50 p-3 rounded-lg border border-yellow-100 text-sm">
                    {editingId === staff.id ? (
                      <div className="space-y-2">
                        <textarea 
                          className="w-full p-2 border border-yellow-200 rounded text-xs focus:ring-1 focus:ring-yellow-400 outline-none"
                          rows={3}
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="输入评价或备注..."
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                           <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700">取消</button>
                           <button onClick={() => saveEdit(staff)} className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600">保存</button>
                        </div>
                      </div>
                    ) : (
                      <div className="group/note cursor-pointer" onClick={() => startEdit(staff)}>
                         <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-yellow-700 mb-1 block">人才评价/备注</span>
                            <Edit3 size={12} className="text-yellow-400 opacity-0 group-hover/note:opacity-100 transition-opacity" />
                         </div>
                         <p className="text-gray-600 text-xs line-clamp-3 min-h-[1.5em]">
                           {staff.talentNotes || '暂无备注，点击添加...'}
                         </p>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TalentPool;
