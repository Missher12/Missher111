
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit2, 
  Shield, 
  Briefcase,
  CheckCircle2,
  Clock,
  X,
  CreditCard,
  XCircle,
  FileSpreadsheet,
  Settings,
  Trash2,
  Plus,
  UserCheck,
  Star,
  Award,
  AlertTriangle
} from 'lucide-react';
import { Staff, StaffStatus, Group } from '../types';

interface StaffManagerProps {
  viewMode: 'CANDIDATES' | 'EMPLOYEES'; // New prop to control the mode
  staffList: Staff[];
  groups: Group[];
  onUpdateStaff: (staff: Staff) => void;
  onAddStaff: (staff: Staff) => void;
  onBatchAddStaff: (staffList: Staff[]) => void;
  onAddGroup: (group: Group) => void;
  onDeleteGroup: (groupId: string) => void;
}

const StaffManager: React.FC<StaffManagerProps> = ({ 
  viewMode,
  staffList, 
  groups,
  onUpdateStaff, 
  onAddStaff, 
  onBatchAddStaff,
  onAddGroup,
  onDeleteGroup
}) => {
  // Initialize filter based on mode
  const [filterStatus, setFilterStatus] = useState<'ALL' | StaffStatus>(
    viewMode === 'CANDIDATES' ? 'PENDING' : 'ACTIVE'
  );

  // Reset filter when viewMode changes
  useEffect(() => {
    setFilterStatus(viewMode === 'CANDIDATES' ? 'PENDING' : 'ACTIVE');
  }, [viewMode]);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // Batch Import State
  const [batchInput, setBatchInput] = useState('');
  const [parsedBatch, setParsedBatch] = useState<Staff[]>([]);

  // Group Management State
  const [newGroupName, setNewGroupName] = useState('');

  // Computed filtered list
  const filteredStaff = staffList.filter(staff => {
    // Mode Logic
    if (viewMode === 'CANDIDATES') {
      if (staff.status === 'ACTIVE') return false; // Hide active employees
    } else {
      if (staff.status !== 'ACTIVE') return false; // Hide non-active
    }

    const matchesStatus = filterStatus === 'ALL' || staff.status === filterStatus;
    const matchesSearch = staff.name.includes(searchTerm) || 
                          staff.idCard.includes(searchTerm) ||
                          staff.roles.some(r => r.groupName.includes(searchTerm));
    return matchesStatus && matchesSearch;
  });

  const handleEditClick = (staff: Staff) => {
    setEditingStaff(JSON.parse(JSON.stringify(staff))); // Deep copy
    setIsEditModalOpen(true);
  };

  const handleToggleTalent = (e: React.MouseEvent, staff: Staff) => {
    e.stopPropagation(); // 阻止事件冒泡，防止触发其他行点击事件
    
    // 直接切换状态，不使用阻塞的 prompt/confirm
    // 备注可以在“人才库”页面补充
    const newIsTalent = !staff.isTalent;
    
    onUpdateStaff({
      ...staff,
      isTalent: newIsTalent,
      // 如果是加入人才库且没有备注，初始化为空字符串；如果是移除，保留备注以防误操作
      talentNotes: staff.talentNotes || ''
    });
  };

  const handleAddNew = () => {
    const newStaff: Staff = {
      id: crypto.randomUUID(),
      name: '',
      idCard: '', // Default empty
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
      status: viewMode === 'CANDIDATES' ? 'PENDING' : 'ACTIVE',
      roles: [],
      joinDate: new Date().toISOString().split('T')[0]
    };
    setEditingStaff(newStaff);
    setIsEditModalOpen(true);
  };

  const handleSaveStaff = () => {
    if (editingStaff && editingStaff.name && editingStaff.idCard) {
      if (staffList.find(s => s.id === editingStaff.id)) {
        onUpdateStaff(editingStaff);
      } else {
        onAddStaff(editingStaff);
      }
      setIsEditModalOpen(false);
      setEditingStaff(null);
    } else {
      alert("请填写姓名和身份证号");
    }
  };

  // --- Batch Import Logic ---
  const parseBatchInput = () => {
    const lines = batchInput.split('\n').filter(line => line.trim() !== '');
    const newStaffList: Staff[] = [];

    lines.forEach((line, index) => {
      // Support common delimiters: Tab (Excel), Comma, or Space
      const parts = line.split(/[,\t，\s]+/).filter(p => p.trim() !== '');
      if (parts.length >= 2) {
        newStaffList.push({
          id: crypto.randomUUID(),
          name: parts[0],
          idCard: parts[1],
          phone: parts[2] || '',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
          status: 'PENDING',
          roles: [],
          joinDate: new Date().toISOString().split('T')[0]
        });
      }
    });
    setParsedBatch(newStaffList);
  };

  const confirmBatchImport = () => {
    if (parsedBatch.length > 0) {
      onBatchAddStaff(parsedBatch);
      setIsBatchModalOpen(false);
      setBatchInput('');
      setParsedBatch([]);
    }
  };

  // --- Group Logic ---
  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      onAddGroup({
        id: crypto.randomUUID(),
        name: newGroupName,
        description: '新建分组'
      });
      setNewGroupName('');
    }
  };

  const handleDeleteGroup = (id: string) => {
    // Check if staff are in this group
    const isUsed = staffList.some(s => s.roles.some(r => r.groupId === id));
    if (isUsed) {
      alert("无法删除：该分组下仍有成员，请先移除成员。");
      return;
    }
    if(confirm("确定删除该分组吗？")) {
      onDeleteGroup(id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {viewMode === 'CANDIDATES' ? '面试/候选人管理' : '正式员工/组织架构'}
          </h1>
          <p className="text-gray-500 text-sm">
            {viewMode === 'CANDIDATES' 
              ? '管理招聘流程：导入名单、查看面试状态及录用结果' 
              : '管理企业内部人员：分组分配、组长任命及通讯录'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {viewMode === 'EMPLOYEES' && (
            <button 
              onClick={() => setIsGroupModalOpen(true)}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Settings size={18} />
              <span>分组管理</span>
            </button>
          )}
          
          {viewMode === 'CANDIDATES' && (
            <button 
              onClick={() => setIsBatchModalOpen(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <FileSpreadsheet size={18} />
              <span>批量导入名单</span>
            </button>
          )}
          
          <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <UserPlus size={18} />
            <span>{viewMode === 'CANDIDATES' ? '录入候选人' : '录入员工'}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 w-full md:w-64">
          <Search size={18} className="text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder={viewMode === 'CANDIDATES' ? "搜索姓名或身份证..." : "搜索姓名、组别..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none text-sm w-full"
          />
        </div>
        
        <div className="flex gap-2">
          {viewMode === 'CANDIDATES' ? (
            <>
              {[
                { label: '全部', value: 'ALL' },
                { label: '待面试', value: 'PENDING' },
                { label: '已面试 (待定岗)', value: 'INTERVIEWED' },
                { label: '未通过', value: 'REJECTED' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilterStatus(tab.value as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === tab.value 
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                      : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </>
          ) : (
             <div className="px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200 flex items-center gap-2">
                <CheckCircle2 size={14} /> 仅显示正式员工
             </div>
          )}
        </div>
      </div>

      {/* Staff List Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-4 font-medium">基本信息</th>
              <th className="px-6 py-4 font-medium">身份ID (登录凭证)</th>
              <th className="px-6 py-4 font-medium">当前状态</th>
              {viewMode === 'EMPLOYEES' && <th className="px-6 py-4 font-medium">所属组别 / 职位</th>}
              <th className="px-6 py-4 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStaff.map((staff) => (
              <tr key={staff.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={staff.avatar} alt={staff.name} className="w-10 h-10 rounded-full bg-gray-100" />
                    <div>
                      <p className="font-semibold text-gray-800 flex items-center gap-1">
                        {staff.name}
                        {staff.isTalent && <Award size={12} className="text-yellow-500 fill-yellow-500" />}
                      </p>
                      <p className="text-xs text-gray-500">{staff.phone || '未录入手机号'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-mono text-gray-600">
                  {staff.idCard}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    staff.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                    staff.status === 'INTERVIEWED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    staff.status === 'PENDING' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {staff.status === 'ACTIVE' && <CheckCircle2 size={12} />}
                    {staff.status === 'INTERVIEWED' && <Briefcase size={12} />}
                    {staff.status === 'PENDING' && <Clock size={12} />}
                    {staff.status === 'REJECTED' && <XCircle size={12} />}
                    {staff.status === 'ACTIVE' ? '正式员工' : 
                     staff.status === 'INTERVIEWED' ? '已面试' : 
                     staff.status === 'PENDING' ? '待面试' : '未通过'}
                  </span>
                </td>
                
                {viewMode === 'EMPLOYEES' && (
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {staff.roles.length > 0 ? staff.roles.map((role, idx) => (
                        <span key={idx} className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs ${
                          role.isLeader 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {role.isLeader && <Shield size={10} className="fill-current" />}
                          {role.groupName} {role.isLeader ? '组长' : '成员'}
                        </span>
                      )) : (
                        <span className="text-red-400 text-xs flex items-center gap-1">
                          <AlertTriangle size={10} /> 待分配组别
                        </span>
                      )}
                    </div>
                  </td>
                )}

                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => handleToggleTalent(e, staff)}
                      title={staff.isTalent ? "移出人才库" : "纳入人才库"}
                      className={`p-1.5 rounded-lg transition-colors border ${
                        staff.isTalent 
                          ? 'bg-yellow-50 text-yellow-500 border-yellow-200 hover:bg-yellow-100' 
                          : 'bg-white text-gray-300 border-gray-200 hover:text-yellow-400 hover:border-yellow-200'
                      }`}
                    >
                      <Star size={16} className={staff.isTalent ? "fill-current" : ""} />
                    </button>
                    <button 
                      onClick={() => handleEditClick(staff)}
                      className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg"
                    >
                      <Edit2 size={14} />
                      {viewMode === 'CANDIDATES' && staff.status === 'INTERVIEWED' ? '定岗/转正' : '编辑'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredStaff.length === 0 && (
              <tr>
                <td colSpan={viewMode === 'EMPLOYEES' ? 5 : 4} className="px-6 py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center">
                    <Users size={48} className="text-gray-200 mb-2" />
                    <p>没有找到符合条件的{viewMode === 'CANDIDATES' ? '候选人' : '员工'}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Batch Import Modal (Only for Candidates) --- */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-green-50">
                 <div className="flex items-center gap-2 text-green-800">
                    <FileSpreadsheet size={20} />
                    <h3 className="font-bold text-lg">批量导入候选人</h3>
                 </div>
                 <button onClick={() => setIsBatchModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                 <div className="mb-4 bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-700">
                    <p className="font-bold mb-1">使用说明：</p>
                    <p>请从 Excel 或 CSV 文件中复制数据并粘贴到下方文本框。系统会自动创建为“待面试”状态。</p>
                    <p className="font-mono bg-white inline-block px-2 py-1 rounded mt-1 border border-blue-200">
                       姓名 [空格/Tab] 身份证号 [空格/Tab] 手机号(可选)
                    </p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                    <div className="flex flex-col">
                       <label className="text-sm font-medium text-gray-700 mb-2">粘贴数据区域</label>
                       <textarea 
                          className="flex-1 w-full border border-gray-300 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[300px]"
                          placeholder={`张三\t440101199001011234\t13800000001\n李四\t440101199001011235\t13800000002`}
                          value={batchInput}
                          onChange={(e) => setBatchInput(e.target.value)}
                       />
                       <button 
                         onClick={parseBatchInput}
                         className="mt-3 w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900"
                       >
                         解析预览 &gt;&gt;
                       </button>
                    </div>

                    <div className="flex flex-col">
                       <label className="text-sm font-medium text-gray-700 mb-2">预览解析结果 ({parsedBatch.length} 人)</label>
                       <div className="flex-1 border border-gray-200 rounded-lg bg-gray-50 overflow-y-auto min-h-[300px] p-2">
                          {parsedBatch.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">暂无数据，请先粘贴并点击解析</div>
                          ) : (
                            <table className="w-full text-xs text-left">
                               <thead className="text-gray-500 border-b border-gray-200">
                                  <tr>
                                    <th className="p-2">姓名</th>
                                    <th className="p-2">身份证</th>
                                    <th className="p-2">手机</th>
                                  </tr>
                               </thead>
                               <tbody>
                                  {parsedBatch.map((p, i) => (
                                    <tr key={i} className="border-b border-gray-100 last:border-0">
                                       <td className="p-2 font-bold text-gray-800">{p.name}</td>
                                       <td className="p-2 font-mono text-gray-600">{p.idCard}</td>
                                       <td className="p-2 text-gray-500">{p.phone}</td>
                                    </tr>
                                  ))}
                               </tbody>
                            </table>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                 <button onClick={() => setIsBatchModalOpen(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-white text-gray-700">取消</button>
                 <button 
                   onClick={confirmBatchImport}
                   disabled={parsedBatch.length === 0}
                   className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-200"
                 >
                   确认导入
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- Group Management Modal --- */}
      {isGroupModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
               <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-lg text-gray-800">分组管理</h3>
                  <button onClick={() => setIsGroupModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
               </div>
               
               <div className="p-6 space-y-6">
                  {/* Add New Group */}
                  <div className="flex gap-2">
                     <input 
                       type="text" 
                       placeholder="新组别名称 (如: 技术部)" 
                       className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                       value={newGroupName}
                       onChange={e => setNewGroupName(e.target.value)}
                     />
                     <button 
                       onClick={handleAddGroup}
                       disabled={!newGroupName.trim()}
                       className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                     >
                       <Plus size={20} />
                     </button>
                  </div>

                  {/* List Groups */}
                  <div>
                     <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">现有组别列表</h4>
                     <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {groups.map(group => (
                          <div key={group.id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors group">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                                   <Users size={16} />
                                </div>
                                <span className="font-medium text-gray-800">{group.name}</span>
                             </div>
                             <button 
                               onClick={() => handleDeleteGroup(group.id)}
                               className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                             >
                               <Trash2 size={16} />
                             </button>
                          </div>
                        ))}
                        {groups.length === 0 && <p className="text-sm text-gray-400 text-center py-4">暂无分组</p>}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* --- Edit Staff Modal --- */}
      {isEditModalOpen && editingStaff && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">
                {editingStaff.id ? '编辑人员信息' : '录入新人员'}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">姓名 <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={editingStaff.name}
                    onChange={(e) => setEditingStaff({...editingStaff, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="输入姓名"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">身份证号 <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <CreditCard size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input 
                      type="text" 
                      value={editingStaff.idCard}
                      onChange={(e) => setEditingStaff({...editingStaff, idCard: e.target.value})}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="用于登录验证"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                 <label className="block text-sm font-medium text-gray-700">人员状态变更</label>
                 <div className="grid grid-cols-2 gap-3">
                   {['PENDING', 'INTERVIEWED', 'ACTIVE', 'REJECTED'].map((s) => (
                     <button
                        key={s}
                        onClick={() => setEditingStaff({...editingStaff, status: s as StaffStatus})}
                        className={`py-2 px-3 rounded-lg text-sm border flex items-center justify-center gap-2 ${
                          editingStaff.status === s 
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium' 
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                     >
                       {s === 'PENDING' ? '待面试' : 
                        s === 'INTERVIEWED' ? '已面试(待定)' : 
                        s === 'ACTIVE' ? '正式员工' : '未通过'}
                     </button>
                   ))}
                 </div>
              </div>

              {/* Group Logic - Only for Active staff */}
              {editingStaff.status === 'ACTIVE' && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-2">组别与职位分配</label>
                  {groups.length === 0 ? (
                    <p className="text-sm text-red-500">请先在“分组管理”中创建组别</p>
                  ) : (
                    <div className="space-y-2">
                      {groups.map(group => {
                        const currentRole = editingStaff.roles.find(r => r.groupId === group.id);
                        const isSelected = !!currentRole;
                        const isLeader = currentRole?.isLeader || false;

                        return (
                          <div key={group.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isSelected ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-200'}`}>
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditingStaff({
                                      ...editingStaff,
                                      roles: [...editingStaff.roles, { groupId: group.id, groupName: group.name, isLeader: false }]
                                    });
                                  } else {
                                    setEditingStaff({
                                      ...editingStaff,
                                      roles: editingStaff.roles.filter(r => r.groupId !== group.id)
                                    });
                                  }
                                }}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className={`text-sm ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{group.name}</span>
                            </div>
                            
                            {isSelected && (
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <span className="text-xs text-gray-500">设为组长</span>
                                <div 
                                  onClick={() => {
                                    const newRoles = editingStaff.roles.map(r => 
                                      r.groupId === group.id ? { ...r, isLeader: !r.isLeader } : r
                                    );
                                    setEditingStaff({ ...editingStaff, roles: newRoles });
                                  }}
                                  className={`w-10 h-5 rounded-full flex items-center transition-colors p-1 ${isLeader ? 'bg-purple-600 justify-end' : 'bg-gray-300 justify-start'}`}
                                >
                                  <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm" />
                                </div>
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                取消
              </button>
              <button 
                onClick={handleSaveStaff}
                disabled={!editingStaff.name}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存信息
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Import needed for the empty state jsx which uses AlertTriangle */}
      <div className="hidden">
          <AlertTriangle size={10} />
      </div>
    </div>
  );
};

export default StaffManager;
