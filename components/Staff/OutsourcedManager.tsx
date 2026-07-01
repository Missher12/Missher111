import React, { useState, useMemo } from 'react';
import { Staff, Group, RegistrationRecord, GroupRole, PermissionSettings } from '../../types';
import { 
  Users, 
  Briefcase, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  Shield, 
  UserPlus, 
  X,
  User,
  Check,
  CreditCard,
  Phone,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';
import { maskPhone, maskIdCard } from '../../utils';

interface OutsourcedManagerProps {
  staffList: Staff[];
  groups: Group[];
  registrationList: RegistrationRecord[];
  onSiteRecords: RegistrationRecord[]; 
  permissionSettings: PermissionSettings;
  onUpdateStaff: (staff: Staff) => void;
  onAddStaff: (staff: Staff) => void;
  onBatchAddStaff: (staffList: Staff[]) => void;
  onAddGroup: (group: Group) => void;
  onUpdateGroup: (group: Group) => void;
  onDeleteGroup: (groupId: string) => void;
}

const PENDING_GROUP_ID = 'g_pending_allocation';

const OutsourcedManager: React.FC<OutsourcedManagerProps> = ({
  staffList,
  groups,
  registrationList,
  onSiteRecords, 
  permissionSettings,
  onUpdateStaff,
  onAddStaff,
  onBatchAddStaff,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [addMemberSearchTerm, setAddMemberSearchTerm] = useState(''); 
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newStaffData, setNewStaffData] = useState({ name: '', phone: '', idCard: '' });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCandidates, setImportCandidates] = useState<RegistrationRecord[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());

  const [groupSearchTerm, setGroupSearchTerm] = useState(''); 
  
  // Animation State
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedGroup = useMemo(() => 
    groups.find(g => g.id === selectedGroupId) || groups[0] || null
  , [groups, selectedGroupId]);

  if (!selectedGroupId && groups.length > 0) {
    setSelectedGroupId(groups[0].id);
  }

  const filteredGroupStaff = useMemo(() => {
    if (!selectedGroup) return [];
    
    let staffInGroup = staffList.filter(s => s.status === 'ACTIVE');

    if (selectedGroup.id === PENDING_GROUP_ID) {
       staffInGroup = staffInGroup.filter(s => 
         s.roles.length === 0 || s.roles.some(r => r.groupId === PENDING_GROUP_ID)
       );
    } else {
       staffInGroup = staffInGroup.filter(s => s.roles.some(r => r.groupId === selectedGroup.id));
    }

    const term = groupSearchTerm.toLowerCase();
    if (term) {
        return staffInGroup.filter(s => 
            s.name.toLowerCase().includes(term) || (s.phone && s.phone.includes(term))
        );
    }
    return staffInGroup;
  }, [staffList, selectedGroup, groupSearchTerm]); 

  // Split into leaders and members for rendering
  const leaders = useMemo(() => {
    if (!selectedGroup) return [];
    return filteredGroupStaff.filter(s => s.roles.find(r => r.groupId === selectedGroup.id)?.isLeader);
  }, [filteredGroupStaff, selectedGroup]);

  const members = useMemo(() => {
    if (!selectedGroup) return [];
    return filteredGroupStaff.filter(s => !s.roles.find(r => r.groupId === selectedGroup.id)?.isLeader);
  }, [filteredGroupStaff, selectedGroup]);

  const availableStaff = useMemo(() => {
    if (!selectedGroup) return [];
    const term = addMemberSearchTerm.toLowerCase(); 
    return staffList.filter(s => 
      s.status === 'ACTIVE' && 
      !s.roles.some(r => r.groupId === selectedGroup.id) &&
      (s.name.toLowerCase().includes(term) || (s.phone && s.phone.includes(term)))
    );
  }, [staffList, selectedGroup, addMemberSearchTerm]);

  const handleCreateGroup = () => {
    setEditingGroup({ id: crypto.randomUUID(), name: '', description: '' });
    setIsGroupModalOpen(true);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup({ ...group });
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = () => {
    if (!editingGroup || !editingGroup.name.trim()) return;
    
    if (groups.find(g => g.id === editingGroup.id)) {
       onUpdateGroup(editingGroup);
    } else {
       onAddGroup(editingGroup);
       setSelectedGroupId(editingGroup.id);
    }
    setIsGroupModalOpen(false);
    setEditingGroup(null);
  };

  const handleDeleteGroupClick = (id: string) => {
    const hasMembers = staffList.some(s => s.roles.some(r => r.groupId === id));
    if (hasMembers) {
      alert('该分组下仍有成员，无法删除。请先移除成员。');
      return;
    }
    if (confirm('确定要删除此分组吗？')) {
      onDeleteGroup(id);
      if (selectedGroupId === id) setSelectedGroupId(null);
    }
  };

  const handleRemoveMember = (staff: Staff, groupId: string) => {
    if (confirm(`确定将 ${staff.name} 移出该组吗？`)) {
      const newRoles = staff.roles.filter(r => r.groupId !== groupId);
      onUpdateStaff({ ...staff, roles: newRoles });
    }
  };

  const handleToggleLeader = (staff: Staff, groupId: string) => {
    const newRoles = staff.roles.map(r => {
      if (r.groupId === groupId) {
        return { ...r, isLeader: !r.isLeader };
      }
      return r;
    });
    onUpdateStaff({ ...staff, roles: newRoles });
  };

  const handleAddExistingMember = (staff: Staff) => {
    if (!selectedGroup) return;
    
    const newRole: GroupRole = {
      groupId: selectedGroup.id,
      groupName: selectedGroup.name,
      isLeader: false
    };

    const updatedRoles = staff.roles.filter(r => r.groupId !== PENDING_GROUP_ID);
    onUpdateStaff({ ...staff, status: 'ACTIVE', roles: [...updatedRoles, newRole] });
  };

  const handleOpenImportModal = () => {
    // Combine registrationList and onSiteRecords
    const allRegistrationSources = [...registrationList, ...onSiteRecords];
    
    // Deduplicate and filter out already existing staff
    const uniqueCandidatesMap = new Map<string, RegistrationRecord>();
    allRegistrationSources.forEach(reg => {
      const key = reg.idCard || reg.phone || reg.name; // Use ID Card, then Phone, then Name for uniqueness
      if (key && !uniqueCandidatesMap.has(key)) {
        // Only add if not already in staffList
        const existsInStaff = staffList.some(s => 
          (s.idCard && reg.idCard && s.idCard === reg.idCard) || 
          (s.phone && reg.phone && s.phone === reg.phone) ||
          (s.name === reg.name && (!reg.phone || s.phone === reg.phone))
        );
        if (!existsInStaff) {
          uniqueCandidatesMap.set(key, reg);
        }
      }
    });

    const candidates = Array.from(uniqueCandidatesMap.values());

    if (candidates.length === 0) {
       alert('未发现可导入的新报名数据 (所有报名人员均已在员工列表中)');
       return;
    }

    setImportCandidates(candidates);
    setSelectedCandidateIds(new Set(candidates.map(c => c.id)));
    setIsImportModalOpen(true);
  };

  const handleToggleCandidate = (id: string) => {
    const newSet = new Set(selectedCandidateIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedCandidateIds(newSet);
  };

  const handleToggleAllCandidates = () => {
    if (selectedCandidateIds.size === importCandidates.length) {
      setSelectedCandidateIds(new Set());
    } else {
      setSelectedCandidateIds(new Set(importCandidates.map(c => c.id)));
    }
  };

  const handleConfirmImport = async () => {
    const selected = importCandidates.filter(c => selectedCandidateIds.has(c.id));
    if (selected.length === 0) return;

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate processing delay

    const newStaff: Staff[] = selected.map(reg => ({
       id: crypto.randomUUID(),
       name: reg.name,
       phone: reg.phone || '',
       idCard: reg.idCard || '',
       avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${reg.name}`,
       status: 'ACTIVE',
       roles: [],
       joinDate: new Date().toISOString().split('T')[0],
       registrationNumber: reg.registrationNumber // Fix: Ensure registration number is carried over
    }));

    onBatchAddStaff(newStaff);
    setIsProcessing(false);
    setIsImportModalOpen(false);
    setImportCandidates([]);
    setSelectedCandidateIds(new Set());
  };

  const handleCreateNewStaff = async () => {
     if (!newStaffData.name) {
        alert('请输入姓名');
        return;
     }
     
     setIsProcessing(true);
     await new Promise(resolve => setTimeout(resolve, 600));

     const newStaff: Staff = {
        id: crypto.randomUUID(),
        name: newStaffData.name,
        phone: newStaffData.phone,
        idCard: newStaffData.idCard,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newStaffData.name}`,
        status: 'ACTIVE',
        roles: [],
        joinDate: new Date().toISOString().split('T')[0]
     };

     onAddStaff(newStaff);
     setIsProcessing(false);
     setIsCreateModalOpen(false);
     setNewStaffData({ name: '', phone: '', idCard: '' });
  };
  
  const renderStaffCard = (staff: Staff) => {
    const isPendingGroupSelected = selectedGroup?.id === PENDING_GROUP_ID;

    const roleInCurrentGroup = staff.roles.find(r => r.groupId === selectedGroup?.id);
    const isLeaderInCurrentGroup = roleInCurrentGroup?.isLeader || false;
    
    let roleDisplay = '成员 (STAFF)';
    if (isPendingGroupSelected) {
      roleDisplay = '待分配'; // Special display for pending group
    } else if (isLeaderInCurrentGroup) {
      roleDisplay = '编外 (LEADER)';
    }
    
    const shouldShowSensitive = permissionSettings.showSensitiveInfo;

    return (
      <div key={staff.id} className="bg-white p-5 rounded-2xl border border-[#E5EEF8] shadow-sm hover:shadow-md hover:border-blue-100/60 transition-all flex flex-col relative text-left">
        
        {/* Delete Button - Always visible for non-pending groups */}
        {selectedGroup && selectedGroup.id !== PENDING_GROUP_ID && (
          <button
            onClick={(e) => { e.stopPropagation(); handleRemoveMember(staff, selectedGroup.id); }}
            className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
            title="移出分组"
          >
            <Trash2 size={12} />
          </button>
        )}

        {/* Name and Phone */}
        <div className="flex flex-col mb-2 mt-1 items-start">
          <h4 className="font-bold text-slate-800 text-sm">{staff.name}</h4>
          <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
            <Phone size={11} className="text-[#1677FF]" /> {shouldShowSensitive ? (staff.phone || 'N/A') : maskPhone(staff.phone)}
          </p>
        </div>
        
        {/* ID Card */}
        <p className="text-xs text-slate-500 font-semibold mb-3.5 flex items-center gap-1.5 items-start">
          <CreditCard size={11} className="shrink-0 text-slate-400 mt-0.5" />
          <span className="truncate">{shouldShowSensitive ? (staff.idCard || 'N/A') : maskIdCard(staff.idCard)}</span>
        </p>

        {/* Role Tag as Button */}
        {selectedGroup && selectedGroup.id !== PENDING_GROUP_ID ? ( // Only allow toggling if not the pending group
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleLeader(staff, selectedGroup.id); }}
            className={`w-full text-center px-2 py-1.5 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 group/role ${isLeaderInCurrentGroup ? 'bg-[#1677FF] text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
            title={isLeaderInCurrentGroup ? "点击取消编外 (LEADER)" : "点击设为编外 (LEADER)"}
          >
              <Shield size={10} fill={isLeaderInCurrentGroup ? "currentColor" : "none"} />
              {roleDisplay}
          </button>
        ) : (
          // For PENDING_GROUP, it's just a static span, not a button.
          <span className={`w-full text-center px-2 py-1.5 text-[11px] font-bold rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center gap-1`}>
              <Shield size={10} className="text-slate-300" /> {/* Grey shield for pending */}
              {roleDisplay}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full gap-6 animate-fade-in pb-6">
      {/* Left Sidebar: Groups List */}
      <div className="w-64 bg-white rounded-2xl shadow-sm border border-[#E5EEF8] flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/40">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
            <Briefcase size={16} className="text-[#1677FF]" /> 分组列表
          </h3>
          <button onClick={handleCreateGroup} className="p-1.5 hover:bg-white hover:text-[#1677FF] rounded-xl transition-all text-slate-400 shadow-sm border border-[#E5EEF8] hover:border-slate-200">
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {groups.map(group => (
            <div 
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              className={`flex justify-between items-center p-3 rounded-xl cursor-pointer transition-all group/item ${
                selectedGroupId === group.id 
                  ? 'bg-blue-50 text-[#1677FF] font-bold border border-blue-100/50' 
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <span className="truncate text-xs font-semibold">{group.name}</span>
              {selectedGroupId === group.id && (
                <div className="flex items-center gap-1">
                   <button onClick={(e) => { e.stopPropagation(); handleEditGroup(group); }} className="p-1 hover:bg-blue-100 rounded text-[#1677FF] transition-colors">
                      <Edit2 size={11} />
                   </button>
                   {group.id !== PENDING_GROUP_ID && (
                     <button onClick={(e) => { e.stopPropagation(); handleDeleteGroupClick(group.id); }} className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-500 transition-colors">
                        <Trash2 size={11} />
                     </button>
                   )}
                </div>
              )}
            </div>
          ))}
          {groups.length === 0 && (
            <div className="text-center py-8 text-slate-300 text-xs">暂无分组，请新建</div>
          )}
        </div>
      </div>

      {/* Main Content: Group Details */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-[#E5EEF8] flex flex-col overflow-hidden">
        {selectedGroup ? (
          <>
            <div className="p-6 border-b border-slate-50 flex justify-between items-start">
               <div>
                  <h2 className="text-lg font-extrabold text-slate-800 mb-0.5">{selectedGroup.name}</h2>
                  <p className="text-slate-400 text-xs font-semibold">{selectedGroup.description || '暂无描述'}</p>
               </div>
               
               <div className="flex gap-2">
                  {selectedGroup.id === PENDING_GROUP_ID ? (
                     <>
                        <button 
                           onClick={handleOpenImportModal}
                           className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
                        >
                           <FileSpreadsheet size={14} /> 从报名名单导入
                        </button>
                        <button 
                           onClick={() => setIsCreateModalOpen(true)}
                           className="flex items-center gap-2 bg-[#1677FF] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-50/20 hover:bg-[#0B5FCC] transition-all"
                        >
                           <Plus size={14} /> 直接录入新人
                        </button>
                     </>
                  ) : (
                     <button 
                       onClick={() => setIsAddMemberModalOpen(true)}
                       className="flex items-center gap-2 bg-[#1677FF] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-50/20 hover:bg-[#0B5FCC] transition-all"
                     >
                       <UserPlus size={14} /> 添加成员
                     </button>
                  )}
               </div>
            </div>

            {/* NEW: Group Member Search Bar */}
            <div className="p-4 border-b border-slate-50 bg-white">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      value={groupSearchTerm}
                      onChange={e => setGroupSearchTerm(e.target.value)}
                      placeholder="搜索组内成员姓名或手机..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-[#E5EEF8] rounded-xl focus:outline-none focus:border-sky-300 text-xs font-semibold placeholder-slate-400"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30">
               {filteredGroupStaff.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12">
                    <Users size={48} className="mb-2 opacity-25" />
                    <p className="text-xs font-semibold">本分组暂无成员记录</p>
                 </div>
               ) : (
                 <div className="space-y-6">
                    {/* Leaders Section */}
                    {leaders.length > 0 && (
                      <div>
                         <h3 className="text-xs font-extrabold text-[#1677FF] tracking-wider uppercase mb-3 flex items-center gap-1.5">
                            <Shield size={12} fill="currentColor" /> 组长 / 编外管理人员 ({leaders.length})
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {leaders.map(renderStaffCard)}
                         </div>
                      </div>
                    )}

                    {/* Members Section */}
                    <div>
                       {leaders.length > 0 && <div className="h-px bg-slate-100 my-6"></div>}
                       <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3 flex items-center gap-1.5">
                          <Users size={12} /> 正式成员名单 ({members.length})
                       </h3>
                       {members.length === 0 ? (
                         <p className="text-xs text-slate-400 italic">暂无正式成员</p>
                       ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {members.map(renderStaffCard)}
                         </div>
                       )}
                    </div>
                 </div>
               )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
             <Briefcase size={48} className="mb-2 opacity-25" />
             <p className="text-xs">请在左侧选择或新建一个编组</p>
          </div>
        )}
      </div>

      {/* GROUP ADD/EDIT MODAL */}
      {isGroupModalOpen && editingGroup && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 animate-in zoom-in duration-200 border border-[#E5EEF8]">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-extrabold text-slate-800">
                     {groups.find(g => g.id === editingGroup.id) ? '编辑编组信息' : '创建新编组'}
                  </h3>
                  <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-all"><X size={16} /></button>
               </div>
               
               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">编组名称 <span className="text-rose-500">*</span></label>
                     <input 
                        type="text" 
                        value={editingGroup.name}
                        onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-sky-300 outline-none transition-all text-sm font-semibold placeholder-slate-400"
                        placeholder="请输入编组名称"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">编组描述 / 备注</label>
                     <textarea 
                        value={editingGroup.description || ''}
                        onChange={e => setEditingGroup({ ...editingGroup, description: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-sky-300 outline-none transition-all text-sm font-semibold placeholder-slate-400 resize-none h-24"
                        placeholder="输入编组描述或备注信息 (选填)"
                     />
                  </div>
               </div>

               <div className="mt-6 flex justify-end gap-2">
                  <button onClick={() => setIsGroupModalOpen(false)} className="px-4 py-2.5 bg-slate-50 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors">取消</button>
                  <button 
                     onClick={handleSaveGroup} 
                     disabled={!editingGroup.name.trim()} 
                     className="px-5 py-2.5 bg-[#1677FF] text-white rounded-xl text-xs font-bold hover:bg-[#0B5FCC] transition-all shadow-md shadow-blue-50/20 disabled:opacity-40"
                  >
                     保存
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* MEMBER SELECTION MODAL */}
      {isAddMemberModalOpen && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg h-[80vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden relative border border-[#E5EEF8]">
               <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/40">
                  <div>
                     <h3 className="font-extrabold text-sm text-slate-800">分配人员到当前分组</h3>
                     <p className="text-[10px] text-slate-400 font-semibold mt-0.5">仅显示未加入该组的活跃员工</p>
                  </div>
                  <button onClick={() => setIsAddMemberModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-50 rounded-full"><X size={16} /></button>
               </div>
               
               {/* Search bar inside Add Member modal */}
               <div className="p-3 bg-white border-b border-slate-50">
                  <div className="relative">
                     <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input 
                        type="text" 
                        value={addMemberSearchTerm}
                        onChange={e => setAddMemberSearchTerm(e.target.value)}
                        placeholder="在可用员工中搜索姓名或手机..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-sky-300 text-xs font-semibold placeholder-slate-400"
                     />
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
                  {availableStaff.length === 0 ? (
                     <div className="text-center py-12 text-slate-400">
                        <Users size={40} className="mx-auto mb-2 opacity-25" />
                        <p className="text-xs font-semibold">暂无符合条件的可用活跃员工</p>
                        <p className="text-[10px] text-slate-400 mt-1">仅显示未加入该组的活跃员工</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableStaff.map(staff => {
                           const currentGroups = staff.roles.map(r => r.groupName).join(', ');
                           return (
                              <div key={staff.id} className="flex justify-between items-center p-3 border border-[#E5EEF8] rounded-xl hover:border-sky-300 hover:shadow-sm transition-all bg-white group">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                     <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 text-xs font-bold">
                                        <User size={14} />
                                     </div>
                                     <div className="overflow-hidden">
                                        <p className="font-bold text-slate-800 text-xs">{staff.name}</p>
                                        <p className="text-[10px] text-slate-400 truncate max-w-[120px] font-semibold">{currentGroups ? `已在: ${currentGroups}` : '未分组'}</p>
                                     </div>
                                  </div>
                                  <button 
                                    onClick={() => handleAddExistingMember(staff)}
                                    className="p-2 bg-blue-50 text-[#1677FF] rounded-xl hover:bg-[#1677FF] hover:text-white transition-all shadow-sm shrink-0"
                                  >
                                     <Plus size={14} />
                                  </button>
                              </div>
                           );
                        })}
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}

      {/* IMPORT MODAL */}
      {isImportModalOpen && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col animate-in zoom-in duration-200 overflow-hidden relative border border-[#E5EEF8]">
               
               {/* Loading Overlay */}
               {isProcessing && (
                  <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                     <div className="flex flex-col items-center animate-in zoom-in duration-200">
                        <Loader2 className="animate-spin text-[#1677FF] mb-2" size={36} />
                        <p className="text-xs font-bold text-slate-600">正在处理导入数据...</p>
                     </div>
                  </div>
               )}

               <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/40">
                  <div>
                     <h3 className="font-extrabold text-sm text-slate-800">从报名名单导入</h3> 
                     <p className="text-[10px] text-slate-400 font-semibold mt-0.5">仅显示尚未录入员工库的报名人员</p>
                  </div>
                  <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-50 rounded-full"><X size={16} /></button>
               </div>

               <div className="p-3 bg-slate-50 border-b border-[#E5EEF8] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                     <button onClick={handleToggleAllCandidates} className="text-xs font-bold text-[#1677FF] flex items-center gap-1 hover:bg-blue-50/50 px-2 py-1 rounded-xl transition-colors">
                        {selectedCandidateIds.size === importCandidates.length ? <CheckSquare size={14} /> : <Square size={14} />}
                        全选 / 反选
                     </button>
                     <span className="text-[10px] text-slate-400 font-semibold">已选 {selectedCandidateIds.size} 人</span>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
                  {importCandidates.length === 0 ? (
                     <div className="text-center py-12 text-slate-400">
                        暂无新的报名数据
                     </div>
                  ) : (
                     <div className="space-y-2">
                        {importCandidates.map(record => (
                           <div 
                              key={record.id} 
                              onClick={() => handleToggleCandidate(record.id)}
                              className={`flex items-center p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                 selectedCandidateIds.has(record.id) 
                                    ? 'bg-blue-50/50 border-blue-200' 
                                    : 'bg-white border-[#E5EEF8] hover:bg-slate-50/50'
                              }`}
                           >
                              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center mr-3 transition-colors ${
                                 selectedCandidateIds.has(record.id) ? 'bg-[#1677FF] border-[#1677FF]' : 'bg-white border-slate-200'
                              }`}>
                                 {selectedCandidateIds.has(record.id) && <Check size={12} className="text-white" strokeWidth={3} />}
                              </div>
                              <div className="flex-1">
                                 <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-slate-800 text-xs">{record.name}</h4>
                                    <span className="text-[10px] text-slate-400 font-semibold">{record.submissionTime.split('T')[0]}</span>
                                 </div>
                                 <div className="flex gap-4 mt-1 text-[10px] text-slate-400 font-semibold">
                                    <span>{record.phone || '无手机'}</span>
                                    <span>{record.idCard || '无证件'}</span>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>

               <div className="p-4 border-t border-slate-50 bg-slate-50/40 flex justify-end gap-3">
                  <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 bg-white border border-slate-250 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">取消</button>
                  <button 
                     onClick={handleConfirmImport}
                     disabled={selectedCandidateIds.size === 0 || isProcessing}
                     className="px-5 py-2 bg-[#1677FF] text-white rounded-xl text-xs font-bold hover:bg-[#0B5FCC] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-50/20 flex items-center gap-1.5 transition-all"
                  >
                     {isProcessing ? '处理中...' : `确认导入 (${selectedCandidateIds.size})`}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 animate-in zoom-in duration-200 relative overflow-hidden border border-[#E5EEF8]">
               
               {/* Loading Overlay */}
               {isProcessing && (
                  <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                     <Loader2 className="animate-spin text-[#1677FF]" size={32} />
                  </div>
               )}

               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-extrabold text-slate-800">直接录入新人员</h3>
                  <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-50 rounded-full"><X size={16} /></button>
               </div>
               
               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">姓名 <span className="text-rose-500">*</span></label>
                     <div className="relative">
                        <User size={14} className="absolute left-3 top-3.5 text-slate-400" />
                        <input 
                           type="text" 
                           value={newStaffData.name}
                           onChange={e => setNewStaffData({...newStaffData, name: e.target.value})}
                           className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-sky-300 outline-none text-xs font-semibold placeholder-slate-400 transition-all"
                           placeholder="请输入姓名"
                        />
                     </div>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">手机号</label>
                     <div className="relative">
                        <Phone size={14} className="absolute left-3 top-3.5 text-slate-400" />
                        <input 
                           type="text" 
                           value={newStaffData.phone}
                           onChange={e => setNewStaffData({...newStaffData, phone: e.target.value})}
                           className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-sky-300 outline-none text-xs font-semibold placeholder-slate-400 transition-all"
                           placeholder="请输入手机号"
                        />
                     </div>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">身份证 (选填)</label>
                     <div className="relative">
                        <CreditCard size={14} className="absolute left-3 top-3.5 text-slate-400" />
                        <input 
                           type="text" 
                           value={newStaffData.idCard}
                           onChange={e => setNewStaffData({...newStaffData, idCard: e.target.value})}
                           className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-sky-300 outline-none text-xs font-semibold placeholder-slate-400 transition-all"
                           placeholder="用于系统登录验证"
                        />
                     </div>
                  </div>
               </div>

               <div className="mt-6 flex justify-end gap-2">
                  <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2.5 bg-slate-50 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors">取消</button>
                  <button 
                     onClick={handleCreateNewStaff}
                     disabled={!newStaffData.name || isProcessing}
                     className="px-5 py-2.5 bg-[#1677FF] text-white rounded-xl text-xs font-bold hover:bg-[#0B5FCC] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-50/20 flex items-center gap-1.5 transition-all"
                  >
                     {isProcessing ? '录入中...' : '确认录入'}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default OutsourcedManager;
