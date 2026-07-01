
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RegistrationRecord, Group, Staff, PermissionSettings } from '../../types';
import { 
  Search, 
  Trash2, 
  X, 
  FileText, 
  Sun, 
  Moon, 
  Check, 
  FileSpreadsheet,
  Edit,
  Circle,
  Ban,
  Settings,
  Download,
  Plus,
  RefreshCw,
  ArrowRight,
  Eye,
  EyeOff,
  Filter,
  LayoutTemplate,
  Save,
  Grid3X3,
  List,
  UserPlus,
  Share2,
  AlertCircle,
  UploadCloud,
  FileDown,
  CreditCard,
  PenLine,
  Briefcase,
  Loader2
} from 'lucide-react';
import { maskPhone, maskIdCard } from '../../utils';

interface StaffRegistrationProps {
  records: RegistrationRecord[];
  onUpdateRecords: (records: RegistrationRecord[]) => void;
  groups: Group[];
  onBatchAddStaff: (staffList: Staff[]) => void;
  existingStaffList: Staff[];
  permissionSettings: PermissionSettings;
  displayMode?: 'ALL' | 'FORMS' | 'MASTER';
  // New control props
  allowExcelImport?: boolean;
  allowManualEntry?: boolean;
  idPrefix?: string; // New: Custom ID Prefix
}

// ... (Existing AVAILABILITY_STATES and STATE_CONFIG kept same)
const AVAILABILITY_STATES = ['EMPTY', 'FULL', 'AM', 'PM', 'ABSENT'] as const;
type AvailabilityState = typeof AVAILABILITY_STATES[number];

const STATE_CONFIG: Record<AvailabilityState, { label: string; shortLabel: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  EMPTY: { 
    label: '未填', 
    shortLabel: '缺', 
    bg: 'bg-white', 
    text: 'text-gray-300', 
    border: 'border-gray-100',
    icon: <Circle size={8} className="opacity-20" /> 
  },
  FULL: { 
    label: '全天', 
    shortLabel: '全', 
    bg: 'bg-emerald-100', 
    text: 'text-emerald-700', 
    border: 'border-emerald-200',
    icon: <Check size={10} strokeWidth={3} /> 
  },
  AM: { 
    label: '上午', 
    shortLabel: '上', 
    bg: 'bg-blue-100', 
    text: 'text-blue-700', 
    border: 'border-blue-200',
    icon: <Sun size={10} /> 
  },
  PM: { 
    label: '下午', 
    shortLabel: '下', 
    bg: 'bg-orange-100', 
    text: 'text-orange-700', 
    border: 'border-orange-200',
    icon: <Moon size={10} /> 
  },
  ABSENT: {
    label: '缺勤', 
    shortLabel: '缺', 
    bg: 'bg-gray-50', 
    text: 'text-gray-400', 
    border: 'border-gray-200',
    icon: <Ban size={10} />
  }
};

interface ViewMapping {
  name: string;
  phone: string;
  idCard: string;
  gender: string;
  address: string;
  age: string;
  dob: string;
  email: string;
  schedule: string;
  bankFields: string[]; // Fields for Bank Column
  experienceFields: string[]; // Fields for Experience Column
}

const StaffRegistration: React.FC<StaffRegistrationProps> = ({ 
  records, 
  onUpdateRecords, 
  onBatchAddStaff,
  permissionSettings,
  allowExcelImport = true,
  allowManualEntry = true,
  idPrefix = '' // Default empty
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RegistrationRecord | null>(null);

  // Import Modal State (CSV)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection State
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  
  // Processing Animation State
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper for ID generation with prefix
  const generateId = (offset: number) => {
    return `${idPrefix}${String(records.length + offset + 1).padStart(5, '0')}`;
  };

  // Clear selection when view changes
  useEffect(() => {
    setSelectedRecordIds(new Set());
  }, [searchTerm]);

  // Helper to split compound notes string from Import
  const parseCompoundNotes = (fullNotes: string) => {
    if (!fullNotes) return { email: '', bankInfo: [], experience: [] };
    
    const parts = fullNotes.split('|').map(p => p.trim());
    const emailPart = parts.find(p => p.startsWith('邮箱:'));
    const bankParts = parts.filter(p => 
       p.startsWith('银行:') || p.startsWith('开户行:') || p.startsWith('支行:') || p.startsWith('卡号:') || p.includes('银行')
    );
    const expParts = parts.filter(p => 
       !p.startsWith('邮箱:') && 
       !p.startsWith('银行:') && !p.startsWith('开户行:') && !p.startsWith('支行:') && !p.startsWith('卡号:') && !p.includes('银行')
    );

    return {
       email: emailPart ? emailPart.replace('邮箱:', '').trim() : '',
       bankInfo: bankParts,
       experience: expParts
    };
  };

  // Derived Data: The Records to Display
  const displayRecords = useMemo(() => {
    let rawList: any[] = records.map(r => {
        // Parse the single 'notes' string into sections
        const { email, bankInfo, experience } = parseCompoundNotes(r.notes || '');
        return {
          ...r,
          parsedEmail: email,
          parsedBankInfo: bankInfo,
          parsedExperience: experience
        };
    });

    return rawList.filter(r => 
      r.name.includes(searchTerm) || 
      (r.phone && r.phone.includes(searchTerm)) ||
      r.registrationNumber.includes(searchTerm)
    );
  }, [records, searchTerm, idPrefix]);

  // Derived Date Headers
  const dateHeaders = useMemo(() => {
    const dates = new Set<string>();
    displayRecords.forEach(r => {
      try {
        const map = JSON.parse(r.availability || '{}');
        Object.keys(map).forEach(d => dates.add(d));
      } catch(e) {}
    });

    if (dates.size > 0) {
       return Array.from(dates).sort();
    }

    const fallback = [];
    for(let i=0; i<3; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        fallback.push(`${d.getMonth()+1}.${d.getDate()}`);
    }
    return fallback;
  }, [displayRecords]);

  // --- Handlers ---

  const handleUpdateNote = (id: string, newNote: string) => {
    const updated = records.map(r => r.id === id ? { ...r, managementNotes: newNote } : r);
    onUpdateRecords(updated);
  };

  const handlePromoteToStaff = async () => {
    if (selectedRecordIds.size === 0) {
       alert("请先勾选需要导入的人员");
       return;
    }

    if (confirm(`确定将选中的 ${selectedRecordIds.size} 名人员入职到员工库吗？`)) {
       setIsProcessing(true);
       await new Promise(resolve => setTimeout(resolve, 800)); // Animation

       const newStaffList: Staff[] = [];
       
       displayRecords
         .filter(r => selectedRecordIds.has(r.id))
         .forEach(rec => {
            if (rec.name && (rec.idCard || rec.phone)) {
               newStaffList.push({
                  id: rec.id || crypto.randomUUID(),
                  name: rec.name,
                  idCard: rec.idCard || rec.phone || '', 
                  phone: rec.phone || '',
                  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.name}`,
                  status: 'ACTIVE',
                  roles: [],
                  joinDate: new Date().toISOString().split('T')[0],
                  isTalent: false
               });
            }
         });

       onBatchAddStaff(newStaffList);
       setSelectedRecordIds(new Set());
       setIsProcessing(false);
    }
  };

  const handleDeleteRecord = (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      onUpdateRecords(records.filter(r => r.id !== id));
    }
  };

  const handleClearAll = () => {
    if (confirm('警告：确定要清空当前列表的所有记录吗？此操作不可恢复。')) {
      onUpdateRecords([]);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedRecordIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedRecordIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedRecordIds.size === displayRecords.length && displayRecords.length > 0) {
      setSelectedRecordIds(new Set());
    } else {
      setSelectedRecordIds(new Set(displayRecords.map(r => r.id)));
    }
  };

  // --- Export Logic ---
  const handleExport = () => {
    // 1. Define Headers
    const fixedHeaders = ['姓名', '手机', '身份证', '性别', '年龄', '出生日期', '地址', '邮箱', '银行信息', '工作经历', '管理员备注'];
    const csvHeaders = [...fixedHeaders, ...dateHeaders];

    // 2. Build Rows
    const csvRows = displayRecords.map(r => {
      // Parse availability
      let availMap: Record<string, string> = {};
      try { availMap = JSON.parse(r.availability || '{}'); } catch(e) {}

      // Get availability values for each date header
      const scheduleValues = dateHeaders.map(date => {
         const status = availMap[date];
         if (status === 'FULL') return '全天';
         if (status === 'AM') return '上午';
         if (status === 'PM') return '下午';
         return '';
      });

      // Format Bank Info
      const bankStr = r.parsedBankInfo ? r.parsedBankInfo.join('; ') : '';
      const expStr = r.parsedExperience ? r.parsedExperience.join('; ') : '';
      
      const shouldShow = permissionSettings.showSensitiveInfo;

      return [
        r.name,
        shouldShow ? r.phone : maskPhone(r.phone),
        shouldShow ? r.idCard : maskIdCard(r.idCard),
        r.gender || '',
        r.age || '',
        r.dob || '',
        r.address || '',
        r.parsedEmail || '',
        bankStr,
        expStr,
        r.managementNotes || '',
        ...scheduleValues
      ].map(val => {
         // Escape quotes and wrap in quotes
         const str = String(val || '');
         if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
         }
         return str;
      }).join(',');
    });

    // 3. Create Blob
    const bom = '\uFEFF';
    const csvContent = bom + csvHeaders.join(',') + '\n' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `汇总名单_${new Date().toLocaleDateString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Import Logic ---
  const handleDownloadTemplate = () => {
    const headers = ['姓名', '出生日期', '年龄', '性别', '手机号码', '邮箱', '身份证号码', '开户行', '支行信息', '银行卡账号', '工作经历', '5.1', '5.2', '5.3'];
    const sampleRow = ['张三', '2000-01-01', '24', '男', '13800138000', 'zhangsan@email.com', '440106200001011234', '招商银行', '广州天河支行', '6225880000000000', '曾任职于某大型连锁餐饮品牌店长，具备3年团队管理经验；熟悉POS系统操作；性格开朗，善于沟通。', '全天', '上午', ''];
    // Add BOM for Excel to recognize UTF-8
    const bom = '\uFEFF'; 
    const csvContent = bom + headers.join(',') + '\n' + sampleRow.join(',');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '报名导入模板.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      // Use timeout to allow UI to update with loading state
      setTimeout(() => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const content = evt.target?.result as string;
            processImport(content);
            setIsImportModalOpen(false);
            setIsProcessing(false);
          };
          reader.readAsText(file); // Default is UTF-8
      }, 500);
    }
  };

  const processImport = (content: string) => {
    // Basic CSV Parsing logic (Comma or Tab)
    const rows = content.split(/\r?\n/).filter(r => r.trim() !== '');
    if (rows.length < 2) {
        alert('文件内容过少，请确保包含标题行和数据行');
        return;
    }

    const header = rows[0].split(/[,\t]+/).map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Detect Columns (Strict match to user request, plus common fallbacks)
    const idx = {
        name: header.findIndex(h => h.includes('姓名') || h.toLowerCase() === 'name'),
        dob: header.findIndex(h => h.includes('出生') || h.includes('生日')),
        age: header.findIndex(h => h.includes('年龄')),
        gender: header.findIndex(h => h.includes('性别')),
        phone: header.findIndex(h => h.includes('手机') || h.includes('电话') || h.toLowerCase().includes('phone') || h.toLowerCase().includes('mobile')),
        email: header.findIndex(h => h.includes('邮箱') || h.includes('邮件') || h.toLowerCase().includes('email')),
        idCard: header.findIndex(h => h.includes('身份证') || h.toLowerCase().includes('id')),
        bank: header.findIndex(h => h.includes('开户行') || h === '银行'),
        branch: header.findIndex(h => h.includes('支行') || h.includes('网点')),
        card: header.findIndex(h => h.includes('账号') || h.includes('卡号') || h === '银行卡' || h.includes('account')),
        notes: header.findIndex(h => h.includes('备注') || h.includes('经历'))
    };

    if (idx.name === -1) {
        alert('解析失败：未找到“姓名”列。请下载模板并使用 UTF-8 编码格式。');
        return;
    }

    // Detect Schedule Columns (look for dates like 5.1, 5/1 etc or anything not matched above)
    const dynamicHeaders: { index: number, date: string }[] = [];
    header.forEach((h, i) => {
       if (Object.values(idx).includes(i)) return;
       // Heuristic: contains digit
       if (/\d/.test(h)) { 
          dynamicHeaders.push({ index: i, date: h });
       }
    });

    const newRecords: RegistrationRecord[] = [];
    
    for(let i=1; i<rows.length; i++) {
        const cols = rows[i].split(/[,\t]+/).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 2) continue;

        const name = idx.name !== -1 ? cols[idx.name] : '';
        if (!name) continue;

        const phone = idx.phone !== -1 ? cols[idx.phone] : '';
        const idCard = idx.idCard !== -1 ? cols[idx.idCard] : '';
        const dob = idx.dob !== -1 ? cols[idx.dob] : '';
        const age = idx.age !== -1 ? cols[idx.age] : '';
        const gender = idx.gender !== -1 ? cols[idx.gender] : '';
        
        const email = idx.email !== -1 ? cols[idx.email] : '';
        const bank = idx.bank !== -1 ? cols[idx.bank] : '';
        const branch = idx.branch !== -1 ? cols[idx.branch] : '';
        const card = idx.card !== -1 ? cols[idx.card] : '';
        const notes = idx.notes !== -1 ? cols[idx.notes] : '';
        
        // Build Compound Notes for storage, we will parse them out in display
        // Format: "邮箱: xxx | 开户行: xxx | 支行: xxx | 卡号: xxx | 备注内容"
        let noteParts = [];
        if (email) noteParts.push(`邮箱: ${email}`);
        if (bank) noteParts.push(`开户行: ${bank}`);
        if (branch) noteParts.push(`支行: ${branch}`);
        if (card) noteParts.push(`卡号: ${card}`);
        if (notes) noteParts.push(notes); // This will be treated as experience/notes
        
        const fullNotes = noteParts.join(' | ');

        // Build Availability
        const availability: Record<string, string> = {};
        dynamicHeaders.forEach(dh => {
            const val = cols[dh.index];
            if (val && (val.includes('√') || val.includes('全') || val === '1')) availability[dh.date] = 'FULL';
            else if (val && val.includes('上')) availability[dh.date] = 'AM';
            else if (val && val.includes('下')) availability[dh.date] = 'PM';
        });

        newRecords.push({
            id: crypto.randomUUID(),
            registrationNumber: generateId(newRecords.length), // Use custom prefix
            name,
            phone,
            idCard,
            dob,
            age,
            gender,
            notes: fullNotes,
            submissionTime: new Date().toISOString(),
            availability: JSON.stringify(availability),
            isTalent: false,
            managementNotes: ''
        });
    }

    if (newRecords.length > 0) {
        onUpdateRecords([...records, ...newRecords]);
        alert(`成功导入 ${newRecords.length} 条记录`);
    } else {
        alert('未能解析出有效数据。如果是Excel文件，请另存为 "CSV UTF-8 (逗号分隔)" 格式后再上传。');
    }
  };
  
  const shouldShowSensitive = permissionSettings.showSensitiveInfo;

  return (
    <div className="space-y-4 animate-fade-in pb-24 relative">
      {/* Global Processing Overlay */}
      {isProcessing && (
         <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-in zoom-in duration-200">
               <Loader2 className="animate-spin text-indigo-600 mb-3" size={40} />
               <p className="font-bold text-gray-700 text-lg">正在处理中...</p>
               <p className="text-gray-400 text-xs mt-1">请稍候，不要关闭窗口</p>
            </div>
         </div>
      )}

      {/* Primary Toolbar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 flex flex-col gap-4">
         <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Search */}
            <div className="relative w-full md:w-72">
               <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                 type="text" 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="搜索姓名、手机或银行卡..."
                 className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all duration-300"
               />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
               
               {/* Excel Import Button */}
               {allowExcelImport && (
                  <button 
                      onClick={() => setIsImportModalOpen(true)}
                      className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-extrabold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm shadow-emerald-100"
                  >
                      <UploadCloud size={16} /> Excel导入
                  </button>
               )}

                {/* Export Button */}
                <button 
                    onClick={handleExport}
                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-extrabold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2"
                >
                    <FileDown size={16} /> 导出
                </button>

               {/* Manual Operations */}
               <>
                 {/* Add Manual Entry Button - Only if enabled */}
                 {allowManualEntry && (
                    <button
                       onClick={() => {
                          setEditingRecord({
                             id: crypto.randomUUID(),
                             registrationNumber: generateId(0), // Use custom prefix
                             name: '',
                             submissionTime: new Date().toISOString(),
                             isTalent: false,
                             managementNotes: ''
                          });
                             setIsEditModalOpen(true);
                          }}
                          className="px-4 py-2.5 bg-[#00A2E8] text-white rounded-xl text-sm font-extrabold hover:bg-[#008ec7] transition-all flex items-center gap-2 shadow-sm shadow-sky-100"
                       >
                          <Plus size={16} /> 录入
                       </button>
                    )}

                    {selectedRecordIds.size > 0 && (
                        <button 
                            onClick={handlePromoteToStaff}
                            disabled={isProcessing}
                            className="px-4 py-2.5 bg-sky-50 text-[#00A2E8] border border-sky-150/50 rounded-xl text-sm font-extrabold hover:bg-sky-100/60 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <UserPlus size={16} /> 入职选中 ({selectedRecordIds.size})
                        </button>
                    )}

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    <button 
                      onClick={handleClearAll}
                      className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl transition-all"
                      title="清空名单"
                    >
                       <Trash2 size={16} />
                    </button>
                  </>
            </div>
         </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-50/75 backdrop-blur-md shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <tr className="text-slate-500 text-xs uppercase border-b border-slate-100">
                <th className="p-4 w-[50px] text-center font-bold bg-slate-50/50">
                   <input 
                     type="checkbox" 
                     className="rounded text-[#00A2E8] focus:ring-[#00A2E8] cursor-pointer"
                     onChange={toggleSelectAll} 
                     checked={selectedRecordIds.size > 0 && selectedRecordIds.size === displayRecords.length} 
                   />
                </th>
                <th className="p-4 w-[60px] text-center font-bold bg-gray-50 text-center">编号</th>
                <th className="p-4 w-[240px] text-center font-bold bg-gray-50 text-center">基本信息</th>
                <th className="p-4 w-[200px] text-center font-bold bg-gray-50 text-center">银行信息</th>
                <th className="p-4 w-[200px] text-center font-bold bg-gray-50 text-center">工作经历</th>
                <th className="p-4 w-[150px] text-center font-bold bg-gray-50 text-center">管理员备注</th>
                
                {/* Dynamic Date Headers */}
                {dateHeaders.map(date => (
                   <th key={date} className="p-2 w-[60px] text-center font-bold bg-indigo-50/30 border-l border-white">
                      {date}
                   </th>
                ))}

                <th className="p-4 w-[80px] text-center font-bold bg-gray-50">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {displayRecords.length === 0 ? (
                  <tr>
                     <td colSpan={7 + dateHeaders.length} className="py-20 text-center text-gray-400">
                        <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-20" />
                        <p>暂无报名数据</p>
                        <p className="text-xs mt-1">请点击“批量导入”或“表单导入”</p>
                     </td>
                  </tr>
               ) : (
                  displayRecords.map((record) => {
                     let availMap: Record<string, string> = {};
                     try { availMap = JSON.parse(record.availability || '{}'); } catch(e) {}

                     return (
                       <tr key={record.id} className={`transition-colors group ${selectedRecordIds.has(record.id) ? 'bg-indigo-50/30' : 'hover:bg-gray-50'}`}>
                          {/* Checkbox */}
                          <td className="p-4 text-center align-middle">
                             <input 
                               type="checkbox" 
                               className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                               checked={selectedRecordIds.has(record.id)} 
                               onChange={() => toggleSelection(record.id)} 
                             />
                          </td>
                          {/* ID Number */}
                          <td className="p-4 text-center align-middle">
                             <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono font-bold">
                                {record.registrationNumber}
                             </span>
                          </td>
                          {/* Basic Info */}
                          <td className="p-4 align-middle text-center">
                             <div className="flex flex-col gap-1 items-center justify-center h-full">
                                <div className="flex items-center justify-center gap-2 w-full">
                                   <span className="font-bold text-gray-800 text-sm">{record.name}</span>
                                   {record.gender && <span className={`text-[10px] px-1.5 py-0.5 rounded ${record.gender === '男' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>{record.gender}</span>}
                                   {record.age && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{record.age}岁</span>}
                                </div>
                                <div className="flex flex-col gap-0.5 text-xs text-gray-500 font-mono items-center justify-center w-full">
                                   {record.phone && <span>📞 {shouldShowSensitive ? record.phone : maskPhone(record.phone)}</span>}
                                   {record.idCard && <span>🆔 {shouldShowSensitive ? record.idCard : maskIdCard(record.idCard)}</span>}
                                   {record.dob && <span>🎂 {record.dob}</span>}
                                   {record.parsedEmail && <span className="text-indigo-600 truncate max-w-[200px]">📧 {record.parsedEmail}</span>}
                                </div>
                             </div>
                          </td>
                          {/* Bank Info */}
                          <td className="p-4 align-middle text-xs text-gray-600 leading-relaxed text-left">
                             <div className="flex flex-col items-start gap-0.5 justify-center h-full">
                                {record.parsedBankInfo && record.parsedBankInfo.length > 0 ? (
                                    record.parsedBankInfo.map((info: string, i: number) => {
                                       const shortInfo = info.replace(/^(开户行|银行|支行信息|支行|银行卡号|卡号|银行卡账号|开户银行|银行信息)[:：]?\s*/g, '');
                                       return (
                                          <div key={i} className="mb-0.5 truncate max-w-[180px]" title={info}>
                                             {shortInfo}
                                          </div>
                                       );
                                    })
                                ) : <span className="text-gray-300">-</span>}
                             </div>
                          </td>
                          {/* Work Experience */}
                          <td className="p-4 align-middle text-xs text-gray-600 leading-relaxed text-left">
                             <div className="flex flex-col items-start justify-center h-full">
                               {record.parsedExperience && record.parsedExperience.length > 0 ? (
                                  <div className="line-clamp-4" title={record.parsedExperience.join('\n')}>
                                     {record.parsedExperience.map((exp: string, i: number) => (
                                        <div key={i} className="mb-0.5 flex gap-1 items-center justify-start">
                                           <span>{exp}</span>
                                        </div>
                                     ))}
                                  </div>
                               ) : '-'}
                             </div>
                          </td>
                          {/* Admin Notes */}
                          <td className="p-2 align-middle text-sm text-center">
                             {viewSource === 'MAIN_LIST' ? (
                               <div className="relative group/input w-full flex justify-center">
                                  <input 
                                    type="text" 
                                    value={record.managementNotes || ''}
                                    onChange={(e) => handleUpdateNote(record.id, e.target.value)}
                                    className="w-full bg-transparent border-b border-transparent focus:border-indigo-400 outline-none text-gray-700 py-1 px-1 transition-all placeholder-gray-300 hover:border-gray-200 focus:bg-white text-center"
                                    placeholder="点击输入..."
                                  />
                                  <PenLine size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none opacity-0 group-hover/input:opacity-100" />
                               </div>
                             ) : (
                               <span className="text-gray-500 block text-center">{record.managementNotes || '-'}</span>
                             )}
                          </td>
                          {/* Schedule Grid */}
                          {dateHeaders.map(date => {
                             const stateKey = (availMap[date] as AvailabilityState) || 'EMPTY';
                             const config = STATE_CONFIG[stateKey] || STATE_CONFIG.EMPTY;
                             return (
                               <td key={date} className="p-1 align-middle text-center border-l border-gray-50">
                                  <div 
                                    className={`w-full aspect-square rounded flex flex-col items-center justify-center gap-0.5 transition-all ${config.bg} ${config.text} ${viewSource === 'MAIN_LIST' ? 'cursor-pointer hover:scale-105 shadow-sm' : ''}`}
                                    onClick={() => {
                                       if(viewSource === 'MAIN_LIST') {
                                          const nextIndex = (AVAILABILITY_STATES.indexOf(stateKey) + 1) % AVAILABILITY_STATES.length;
                                          const nextState = AVAILABILITY_STATES[nextIndex];
                                          const newMap = { ...availMap, [date]: nextState };
                                          const updatedList = records.map(r => r.id === record.id ? { ...r, availability: JSON.stringify(newMap) } : r);
                                          onUpdateRecords(updatedList);
                                       }
                                    }}
                                  >
                                     <span className="text-[9px] font-bold opacity-70">{config.shortLabel}</span>
                                     <div className="transform scale-75">{config.icon}</div>
                                  </div>
                               </td>
                             );
                          })}
                          {/* Actions */}
                          <td className="p-4 text-center align-middle">
                             <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={(e) => {
                                     e.stopPropagation();
                                     handleDeleteRecord(record.id);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="删除"
                                >
                                   <Trash2 size={14} />
                                </button>
                             </div>
                          </td>
                       </tr>
                     );
                  })
               )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ... (All Modals: Import, Sync, Edit - Unchanged) ... */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">批量导入报名名单 (Excel/CSV)</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
               <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                 <UploadCloud size={32} className="text-blue-500" />
               </div>
               <p className="font-medium text-gray-700 mb-1">点击上传文件</p>
               <input type="file" ref={fileInputRef} accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            </div>
            
            <div className="mt-4 flex justify-center">
                <button 
                  onClick={handleDownloadTemplate}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors"
                >
                   <FileDown size={14} /> 下载标准模板 (CSV)
                </button>
            </div>
            
            <div className="mt-6 bg-gray-50 p-4 rounded-lg text-xs text-gray-500 space-y-1 border border-gray-100">
               <p className="font-bold text-gray-700 mb-2">文件格式说明：</p>
               <p>• 必须包含：姓名、手机</p>
               <p>• 自动排班：包含日期的列 (如 5.1) 会自动识别。</p>
               <p className="text-orange-600 font-bold mt-2 flex items-center gap-1">
                  <AlertCircle size={12} /> Excel用户请另存为 "CSV UTF-8 (逗号分隔)" 格式
               </p>
            </div>
          </div>
        </div>
      )}
      {/* Manual Entry/Edit Modal */}
      {isEditModalOpen && editingRecord && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in duration-200">
               <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
                  {editingRecord.name ? '编辑人员' : '录入新人员'}
                  <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
               </h3>
               <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-gray-500">姓名</label>
                        <input type="text" value={editingRecord.name} onChange={e => setEditingRecord({...editingRecord, name: e.target.value})} className="w-full border rounded p-2 text-sm" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500">手机</label>
                        <input type="text" value={editingRecord.phone} onChange={e => setEditingRecord({...editingRecord, phone: e.target.value})} className="w-full border rounded p-2 text-sm" />
                     </div>
                  </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-gray-500">身份证 (选填)</label>
                        <input type="text" value={editingRecord.idCard || ''} onChange={e => setEditingRecord({...editingRecord, idCard: e.target.value})} className="w-full border rounded p-2 text-sm" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500">性别</label>
                        <select value={editingRecord.gender || ''} onChange={e => setEditingRecord({...editingRecord, gender: e.target.value})} className="w-full border rounded p-2 text-sm">
                           <option value="">未选择</option>
                           <option value="男">男</option>
                           <option value="女">女</option>
                        </select>
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-gray-500">备注</label>
                     <textarea rows={3} value={editingRecord.notes} onChange={e => setEditingRecord({...editingRecord, notes: e.target.value})} className="w-full border rounded p-2 text-sm" />
                  </div>
                  <button 
                     onClick={() => {
                        if(records.find(r => r.id === editingRecord.id)) {
                           onUpdateRecords(records.map(r => r.id === editingRecord.id ? editingRecord : r));
                        } else {
                           onUpdateRecords([editingRecord, ...records]);
                        }
                        setIsEditModalOpen(false);
                     }}
                     className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700"
                  >
                     保存
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default StaffRegistration;
