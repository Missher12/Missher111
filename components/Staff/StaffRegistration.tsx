import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RegistrationRecord, Group, Staff, PermissionSettings } from '../../types';
import { 
  Search, 
  Trash2, 
  X, 
  Check, 
  FileSpreadsheet,
  Edit,
  Circle,
  Ban,
  Download,
  Plus,
  ArrowRight,
  Eye,
  Filter,
  Save,
  UserPlus,
  AlertCircle,
  UploadCloud,
  FileDown,
  CreditCard,
  PenLine,
  Briefcase,
  Loader2,
  Calendar,
  Layers,
  Phone,
  BookOpen
} from 'lucide-react';
import { maskPhone, maskIdCard } from '../../utils';
import { ConfirmDialog, Toast, DetailDrawer, Button, StatusBadge } from '../ui/Kit';

interface StaffRegistrationProps {
  records: RegistrationRecord[];
  onUpdateRecords: (records: RegistrationRecord[]) => void;
  groups: Group[];
  onBatchAddStaff: (staffList: Staff[]) => void;
  existingStaffList: Staff[];
  permissionSettings: PermissionSettings;
  displayMode?: 'ALL' | 'FORMS' | 'MASTER';
  allowExcelImport?: boolean;
  allowManualEntry?: boolean;
  idPrefix?: string;
}

const AVAILABILITY_STATES = ['EMPTY', 'FULL', 'AM', 'PM', 'ABSENT'] as const;
type AvailabilityState = typeof AVAILABILITY_STATES[number];

const STATE_CONFIG: Record<AvailabilityState, { label: string; bg: string; text: string; border: string }> = {
  EMPTY: { label: '未填', bg: 'bg-white', text: 'text-gray-300', border: 'border-[#E5EEF8]' },
  FULL: { label: '全天', bg: 'bg-emerald-50 text-emerald-700', text: 'text-[#22A06B]', border: 'border-emerald-200' },
  AM: { label: '上午', bg: 'bg-blue-50 text-blue-700', text: 'text-[#1677FF]', border: 'border-blue-200' },
  PM: { label: '下午', bg: 'bg-orange-50 text-orange-700', text: 'text-[#F59E0B]', border: 'border-orange-200' },
  ABSENT: { label: '缺勤', bg: 'bg-rose-50 text-rose-700', text: 'text-[#E5484D]', border: 'border-rose-200' }
};

const StaffRegistration: React.FC<StaffRegistrationProps> = ({ 
  records, 
  onUpdateRecords, 
  onBatchAddStaff,
  existingStaffList,
  permissionSettings,
  displayMode = 'MASTER',
  allowExcelImport = true,
  allowManualEntry = true,
  idPrefix = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Drawers State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RegistrationRecord | null>(null);
  
  // Detail Drawer State
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RegistrationRecord | null>(null);

  // Import Modal State (CSV)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection State
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  
  // Processing Animation State
  const [isProcessing, setIsProcessing] = useState(false);

  // Toast and Dialog Alerts
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('error');
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'primary' | 'warning';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'primary',
    onConfirm: () => {}
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'primary' | 'warning' = 'primary') => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      variant,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const generateId = (offset: number) => {
    return `${idPrefix}${String(records.length + offset + 1).padStart(5, '0')}`;
  };

  useEffect(() => {
    setSelectedRecordIds(new Set());
  }, [searchTerm]);

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

  // Process and parse all records
  const displayRecords = useMemo(() => {
    let rawList = records.map(r => {
        const { email, bankInfo, experience } = parseCompoundNotes(r.notes || '');
        const isAlreadyStaff = existingStaffList.some(s => s.id === r.id || (s.phone && s.phone === r.phone));
        return {
          ...r,
          parsedEmail: email,
          parsedBankInfo: bankInfo,
          parsedExperience: experience,
          isAlreadyStaff
        };
    });

    return rawList.filter(r => 
      r.name.includes(searchTerm) || 
      (r.phone && r.phone.includes(searchTerm)) ||
      r.registrationNumber.includes(searchTerm)
    );
  }, [records, searchTerm, existingStaffList]);

  // Derived Date Headers
  const dateHeaders = useMemo(() => {
    const dates = new Set<string>();
    records.forEach(r => {
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
  }, [records]);

  // Handle direct note updates
  const handleUpdateNote = (id: string, newNote: string) => {
    const updated = records.map(r => r.id === id ? { ...r, managementNotes: newNote } : r);
    onUpdateRecords(updated);
  };

  // Multi row Promote/Check-In to Staff
  const handlePromoteToStaff = () => {
    if (selectedRecordIds.size === 0) {
       setToastType('error');
       setToastMsg("请先勾选需要导入的人员");
       return;
    }

    triggerConfirm(
       '入职员工库确认',
       `确定将选中的 ${selectedRecordIds.size} 名人员正式入职到在册员工库吗？`,
       async () => {
          setIsProcessing(true);
          await new Promise(resolve => setTimeout(resolve, 600));

          const newStaffList: Staff[] = [];
          
          records
            .filter(r => selectedRecordIds.has(r.id))
            .forEach(rec => {
               const alreadyIn = existingStaffList.some(s => s.id === rec.id || s.phone === rec.phone);
               if (!alreadyIn && rec.name && (rec.idCard || rec.phone)) {
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
          setToastType('success');
          setToastMsg(`成功办理 ${newStaffList.length} 人入职员工库`);
       }
    );
  };

  // Single record Promote
  const handleSinglePromote = (rec: RegistrationRecord) => {
    triggerConfirm(
      '单员入职确认',
      `确定为人员【${rec.name}】办理入职并激活账户吗？`,
      async () => {
        setIsProcessing(true);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const newStaff: Staff = {
          id: rec.id || crypto.randomUUID(),
          name: rec.name,
          idCard: rec.idCard || rec.phone || '',
          phone: rec.phone || '',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.name}`,
          status: 'ACTIVE',
          roles: [],
          joinDate: new Date().toISOString().split('T')[0],
          isTalent: false
        };

        onBatchAddStaff([newStaff]);
        setIsProcessing(false);
        setToastType('success');
        setToastMsg(`人员【${rec.name}】已成功加入在册员工库`);
      }
    );
  };

  const handleDeleteRecord = (id: string) => {
    triggerConfirm(
      '删除核销报名记录',
      '确定要永久删除这条报名记录吗？删除后此人将无法扫码签到。',
      () => {
        onUpdateRecords(records.filter(r => r.id !== id));
        setToastType('success');
        setToastMsg('成功删除报名记录');
      },
      'danger'
    );
  };

  const handleClearAll = () => {
    triggerConfirm(
      '清空所有名单',
      '警告：确定要清空当前列表下的所有报名数据吗？此操作不可恢复。',
      () => {
        onUpdateRecords([]);
        setToastType('success');
        setToastMsg('名单已全部清空');
      },
      'danger'
    );
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

  // CSV Export
  const handleExport = () => {
    const fixedHeaders = ['姓名', '手机', '身份证', '性别', '年龄', '出生日期', '地址', '邮箱', '银行信息', '工作经历', '管理员备注'];
    const csvHeaders = [...fixedHeaders, ...dateHeaders];

    const csvRows = displayRecords.map(r => {
      let availMap: Record<string, string> = {};
      try { availMap = JSON.parse(r.availability || '{}'); } catch(e) {}

      const scheduleValues = dateHeaders.map(date => {
         const status = availMap[date];
         if (status === 'FULL') return '全天';
         if (status === 'AM') return '上午';
         if (status === 'PM') return '下午';
         return '';
      });

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
         const str = String(val || '');
         if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
         }
         return str;
      }).join(',');
    });

    const bom = '\uFEFF';
    const csvContent = bom + csvHeaders.join(',') + '\n' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `汇总报名名单_${new Date().toLocaleDateString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Template
  const handleDownloadTemplate = () => {
    const headers = ['姓名', '出生日期', '年龄', '性别', '手机号码', '邮箱', '身份证号码', '开户行', '支行信息', '银行卡账号', '工作经历', '5.1', '5.2', '5.3'];
    const sampleRow = ['张三', '2000-01-01', '24', '男', '13800138000', 'zhangsan@email.com', '440106200001011234', '招商银行', '广州天河支行', '6225880000000000', '曾任职于某大型连锁餐饮品牌'];
    const bom = '\uFEFF';
    const csvContent = bom + headers.join(',') + '\n' + sampleRow.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `批量导入标准模板.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === '\t') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(cell => cell.replace(/^"|"$/g, '').trim());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      setTimeout(() => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              const arrayBuffer = evt.target?.result as ArrayBuffer;
              const uint8Array = new Uint8Array(arrayBuffer);
              
              let decoder = new TextDecoder('utf-8');
              let text = decoder.decode(uint8Array);
              
              const replacementCharCount = (text.match(/\uFFFD/g) || []).length;
              if (replacementCharCount > 0 && (replacementCharCount > 3 || !text.includes('姓名'))) {
                try {
                  const gbkDecoder = new TextDecoder('gbk');
                  const gbkText = gbkDecoder.decode(uint8Array);
                  if (gbkText.includes('姓名')) {
                    text = gbkText;
                  }
                } catch (err) {
                  console.error('GBK decode error, keeping UTF-8', err);
                }
              }
              
              processImport(text);
            } catch (err: any) {
              setToastType('error');
              setToastMsg(`文件上传异常: ${err.message}`);
            } finally {
              setIsImportModalOpen(false);
              setIsProcessing(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }
          };
          reader.readAsArrayBuffer(file);
      }, 500);
    }
  };

  const processImport = (content: string) => {
    const rows = content.split(/\r?\n/).filter(r => r.trim() !== '');
    if (rows.length < 2) {
        setToastType('error');
        setToastMsg('文件无有效行数据');
        return;
    }

    const header = parseCSVRow(rows[0]);
    const idx = {
        name: header.findIndex(h => h.includes('姓名') || h.toLowerCase() === 'name'),
        dob: header.findIndex(h => h.includes('出生') || h.includes('生日')),
        age: header.findIndex(h => h.includes('年龄')),
        gender: header.findIndex(h => h.includes('性别')),
        phone: header.findIndex(h => h.includes('手机') || h.includes('电话') || h.toLowerCase().includes('phone')),
        email: header.findIndex(h => h.includes('邮箱') || h.toLowerCase().includes('email')),
        idCard: header.findIndex(h => h.includes('身份证') || h.toLowerCase().includes('id')),
        bank: header.findIndex(h => h.includes('开户行') || h === '银行'),
        branch: header.findIndex(h => h.includes('支行') || h.includes('网点')),
        card: header.findIndex(h => h.includes('账号') || h.includes('卡号')),
        notes: header.findIndex(h => h.includes('备注') || h.includes('经历'))
    };

    if (idx.name === -1) {
        setToastType('error');
        setToastMsg('未在第一行标题头中找到“姓名”字段，请重新检查');
        return;
    }

    const dynamicHeaders: { index: number, date: string }[] = [];
    header.forEach((h, i) => {
       if (Object.values(idx).includes(i)) return;
       if (/\d/.test(h)) { 
          dynamicHeaders.push({ index: i, date: h });
       }
    });

    const newRecords: RegistrationRecord[] = [];
    
    for(let i=1; i<rows.length; i++) {
        const cols = parseCSVRow(rows[i]);
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
        
        let noteParts = [];
        if (email) noteParts.push(`邮箱: ${email}`);
        if (bank) noteParts.push(`开户行: ${bank}`);
        if (branch) noteParts.push(`支行: ${branch}`);
        if (card) noteParts.push(`卡号: ${card}`);
        if (notes) noteParts.push(notes);
        
        const fullNotes = noteParts.join(' | ');

        const availability: Record<string, string> = {};
        dynamicHeaders.forEach(dh => {
            const val = cols[dh.index];
            if (val && (val.includes('√') || val.includes('全') || val === '1')) availability[dh.date] = 'FULL';
            else if (val && val.includes('上')) availability[dh.date] = 'AM';
            else if (val && val.includes('下')) availability[dh.date] = 'PM';
        });

        newRecords.push({
            id: crypto.randomUUID(),
            registrationNumber: generateId(newRecords.length),
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
        setToastType('success');
        setToastMsg(`批量导入成功！解析到 ${newRecords.length} 名人员`);
    } else {
        setToastType('error');
        setToastMsg('未能检测到任何可以导入的人员。');
    }
  };
  
  const shouldShowSensitive = permissionSettings.showSensitiveInfo;

  return (
    <div className="space-y-4 animate-fade-in pb-16 relative">
      
      {/* Dynamic Processing Overlay */}
      {isProcessing && (
         <div className="fixed inset-0 z-[70] bg-[#102A43]/30 backdrop-blur-xs flex items-center justify-center">
            <div className="bg-white p-6 rounded-[14px] shadow-2xl flex flex-col items-center">
               <Loader2 className="animate-spin text-[#1677FF] mb-2" size={32} />
               <p className="font-bold text-[#102A43] text-sm">正在同步业务中...</p>
            </div>
         </div>
      )}

      {/* Toolbar panel */}
      <div className="bg-white p-5 rounded-[14px] border border-[#E5EEF8] flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7B93AA]" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索姓名、手机或身份证..."
            className="w-full pl-10 pr-4 py-2 bg-[#F8FBFF] border border-transparent rounded-[10px] text-xs outline-none focus:bg-white focus:border-[#1677FF]/40 transition-all font-sans font-medium"
          />
        </div>

        {/* Dynamic Tools Grid */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {allowExcelImport && (
            <Button 
              variant="outline" 
              onClick={() => setIsImportModalOpen(true)}
              className="text-[#22A06B] border-emerald-100 hover:bg-emerald-50/50 flex items-center gap-1.5 py-2 px-3 rounded-[10px] text-xs font-bold"
            >
              <UploadCloud size={14} /> 批量导入
            </Button>
          )}

          <Button 
            variant="outline" 
            onClick={handleExport}
            className="text-[#486581] flex items-center gap-1.5 py-2 px-3 rounded-[10px] text-xs font-bold"
          >
            <FileDown size={14} /> 导出 CSV
          </Button>

          {allowManualEntry && (
            <Button
              variant="primary"
              onClick={() => {
                setEditingRecord({
                  id: crypto.randomUUID(),
                  registrationNumber: generateId(0),
                  name: '',
                  submissionTime: new Date().toISOString(),
                  isTalent: false,
                  managementNotes: ''
                });
                setIsEditModalOpen(true);
              }}
              className="flex items-center gap-1.5 py-2 px-3 rounded-[10px] text-xs font-bold bg-[#1677FF] hover:bg-[#005CE6]"
            >
              <Plus size={14} /> 录入新人员
            </Button>
          )}

          {selectedRecordIds.size > 0 && (
            <Button 
              variant="secondary"
              onClick={handlePromoteToStaff}
              className="text-[#1677FF] border-blue-100 hover:bg-[#EAF4FF] flex items-center gap-1.5 py-2 px-3 rounded-[10px] text-xs font-bold"
            >
              <UserPlus size={14} /> 入职选中 ({selectedRecordIds.size})
            </Button>
          )}

          {records.length > 0 && (
            <>
              <div className="w-px h-5 bg-slate-200 mx-1"></div>
              <button 
                onClick={handleClearAll}
                className="p-2 text-slate-400 hover:text-[#E5484D] hover:bg-rose-50 rounded-[10px] border border-transparent hover:border-rose-100 transition-colors"
                title="清空当前所有报名记录"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Personnel Grid Table */}
      <div className="bg-white rounded-[14px] border border-[#E5EEF8] overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[#7B93AA] text-xs uppercase border-b border-[#E5EEF8] bg-slate-50/50">
                <th className="p-4 w-[50px] text-center font-bold">
                   <input 
                     type="checkbox" 
                     className="rounded text-[#1677FF] focus:ring-[#1677FF] cursor-pointer"
                     onChange={toggleSelectAll} 
                     checked={selectedRecordIds.size > 0 && selectedRecordIds.size === displayRecords.length} 
                   />
                </th>
                <th className="p-4 w-[80px] font-bold text-center">系统编号</th>
                <th className="p-4 font-bold">姓名与性别</th>
                <th className="p-4 font-bold">联系手机</th>
                <th className="p-4 font-bold">核销状态</th>
                <th className="p-4 font-bold">管理员备注</th>
                <th className="p-4 w-[160px] font-bold text-center">核心操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
               {displayRecords.length === 0 ? (
                  <tr>
                     <td colSpan={7} className="py-16 text-center text-[#7B93AA]">
                        <FileSpreadsheet size={36} className="mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-[#102A43]">暂无报名和在册记录</p>
                        <p className="text-[11px] mt-1">请尝试录入新人员或上传标准批量模板</p>
                     </td>
                  </tr>
               ) : (
                  displayRecords.map((record) => {
                     return (
                       <tr key={record.id} className={`transition-colors ${selectedRecordIds.has(record.id) ? 'bg-[#EAF4FF]/40' : 'hover:bg-slate-50/40'}`}>
                          
                          {/* Selector */}
                          <td className="p-4 text-center align-middle">
                             <input 
                               type="checkbox" 
                               className="rounded text-[#1677FF] focus:ring-[#1677FF] cursor-pointer"
                               checked={selectedRecordIds.has(record.id)} 
                               onChange={() => toggleSelection(record.id)} 
                             />
                          </td>

                          {/* ID Badge */}
                          <td className="p-4 text-center align-middle">
                             <span className="inline-block bg-[#F8FBFF] border border-[#E5EEF8] text-[#1677FF] px-2 py-0.5 rounded-[6px] font-mono font-bold">
                                {record.registrationNumber}
                             </span>
                          </td>

                          {/* Name / Sex */}
                          <td className="p-4 align-middle">
                             <div className="flex items-center gap-2">
                                <span className="font-bold text-[#102A43] text-sm">{record.name}</span>
                                {record.gender && (
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-[4px] font-semibold ${
                                    record.gender === '男' ? 'bg-blue-50 text-[#1677FF]' : 'bg-rose-50 text-[#E5484D]'
                                  }`}>
                                    {record.gender}
                                  </span>
                                )}
                                {record.age && (
                                  <span className="text-[10px] text-[#7B93AA] bg-slate-50 border border-slate-100 px-1 rounded-[4px]">
                                    {record.age} 岁
                                  </span>
                                )}
                             </div>
                          </td>

                          {/* Phone (Masked if needed) */}
                          <td className="p-4 align-middle font-mono font-medium text-[#486581] phone-number">
                             {shouldShowSensitive ? record.phone : maskPhone(record.phone || '')}
                          </td>

                          {/* Promote Status */}
                          <td className="p-4 align-middle">
                             {record.isAlreadyStaff ? (
                               <StatusBadge type="success">已入职在册</StatusBadge>
                             ) : (
                               <StatusBadge type="warning">待核销入职</StatusBadge>
                             )}
                          </td>

                          {/* Admin Notes */}
                          <td className="p-4 align-middle max-w-[200px]">
                             <div className="relative group/input w-full">
                                <input 
                                  type="text" 
                                  value={record.managementNotes || ''}
                                  onChange={(e) => handleUpdateNote(record.id, e.target.value)}
                                  className="w-full bg-transparent border-b border-transparent focus:border-[#1677FF]/30 text-[#486581] placeholder-slate-300 hover:border-slate-100 focus:bg-white px-1 outline-none truncate"
                                  placeholder="快速备注..."
                                />
                                <PenLine size={11} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none opacity-0 group-hover/input:opacity-100" />
                             </div>
                          </td>

                          {/* Core Row actions */}
                          <td className="p-4 text-center align-middle">
                             <div className="flex items-center justify-center gap-1.5">
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setSelectedRecord(record);
                                    setIsDetailDrawerOpen(true);
                                  }}
                                  className="py-1 px-2.5 rounded-[8px] text-[11px] font-bold text-[#1677FF] border-blue-50 hover:bg-[#EAF4FF]"
                                >
                                  <Eye size={12} className="mr-1 inline" /> 详情
                                </Button>
                                
                                {!record.isAlreadyStaff && (
                                  <Button 
                                    variant="primary"
                                    onClick={() => handleSinglePromote(record)}
                                    className="py-1 px-2.5 rounded-[8px] text-[11px] font-bold bg-[#1677FF] hover:bg-[#005CE6] text-white"
                                  >
                                    入职
                                  </Button>
                                )}

                                <button 
                                  onClick={() => handleDeleteRecord(record.id)}
                                  className="p-1.5 text-slate-400 hover:text-[#E5484D] hover:bg-rose-50 rounded-lg transition-colors"
                                  title="删除"
                                >
                                  <Trash2 size={13} />
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

      {/* ==========================================
          人员详情抽屉 (DetailDrawer)
          ========================================== */}
      {selectedRecord && (
        <DetailDrawer 
          isOpen={isDetailDrawerOpen}
          title={`工作人员详细档案 #${selectedRecord.registrationNumber}`}
          onClose={() => {
            setSelectedRecord(null);
            setIsDetailDrawerOpen(false);
          }}
        >
          <div className="space-y-6">
            
            {/* Header profile badge */}
            <div className="flex items-center gap-4 p-4 bg-[#F8FBFF] rounded-[14px] border border-[#E5EEF8]">
              <div className="w-12 h-12 rounded-full bg-[#EAF4FF] text-[#1677FF] flex items-center justify-center text-lg font-black font-sans">
                {selectedRecord.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-base text-[#102A43] flex items-center gap-2">
                  {selectedRecord.name}
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-[4px] font-bold ${
                    selectedRecord.gender === '男' ? 'bg-blue-100 text-[#1677FF]' : 'bg-rose-100 text-[#E5484D]'
                  }`}>
                    {selectedRecord.gender || '未知'}
                  </span>
                </h4>
                <p className="text-xs text-[#7B93AA] mt-1 font-mono flex items-center gap-1.5">
                  <Phone size={11} /> {shouldShowSensitive ? selectedRecord.phone : maskPhone(selectedRecord.phone || '')}
                </p>
              </div>
            </div>

            {/* Profile double col list */}
            <div className="space-y-3.5">
              <h5 className="text-[11px] font-bold text-[#7B93AA] uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard size={12} /> 身份与基本信息
              </h5>
              <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-50 text-xs">
                <div>
                  <p className="text-[#7B93AA]">身份证号</p>
                  <p className="font-bold text-[#102A43] mt-0.5 font-mono">
                    {shouldShowSensitive ? selectedRecord.idCard : maskIdCard(selectedRecord.idCard || '')}
                  </p>
                </div>
                <div>
                  <p className="text-[#7B93AA]">年龄 / 出生日期</p>
                  <p className="font-bold text-[#102A43] mt-0.5 font-mono">
                    {selectedRecord.age ? `${selectedRecord.age} 岁` : '-'} / {selectedRecord.dob || '-'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[#7B93AA]">联系地址</p>
                  <p className="font-bold text-[#102A43] mt-0.5 leading-relaxed">{selectedRecord.address || '未提供居住地址'}</p>
                </div>
              </div>
            </div>

            {/* Bank details parsed block */}
            <div className="space-y-3.5">
              <h5 className="text-[11px] font-bold text-[#7B93AA] uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard size={12} className="text-[#1677FF]" /> 绑定银行账户信息
              </h5>
              <div className="bg-[#F8FBFF] p-4 rounded-xl border border-[#E5EEF8] text-xs space-y-2 leading-relaxed">
                {selectedRecord.notes && parseCompoundNotes(selectedRecord.notes).bankInfo.length > 0 ? (
                  parseCompoundNotes(selectedRecord.notes).bankInfo.map((info, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-slate-100/40 last:border-none">
                      <span className="text-[#7B93AA]">{info.split(':')[0] || '信息'}</span>
                      <span className="font-bold text-[#102A43] text-right font-mono">{info.split(':')[1] || info}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[#7B93AA] italic text-center">暂无录入或绑定的支付/银行卡信息</p>
                )}
              </div>
            </div>

            {/* Experience and Notes */}
            <div className="space-y-3.5">
              <h5 className="text-[11px] font-bold text-[#7B93AA] uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={12} className="text-[#22A06B]" /> 履历与管理备注
              </h5>
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-[#7B93AA] font-semibold">历史工作经历</p>
                  <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[#486581] mt-1 leading-relaxed whitespace-pre-line font-medium">
                    {selectedRecord.notes && parseCompoundNotes(selectedRecord.notes).experience.length > 0 
                      ? parseCompoundNotes(selectedRecord.notes).experience.join('\n')
                      : '该工作人员未提交过往工作经验或备注。'}
                  </p>
                </div>
                <div>
                  <p className="text-[#7B93AA] font-semibold">管理端私密备注</p>
                  <textarea 
                    rows={2}
                    value={selectedRecord.managementNotes || ''}
                    onChange={(e) => handleUpdateNote(selectedRecord.id, e.target.value)}
                    className="w-full bg-white border border-[#E5EEF8] rounded-lg p-2.5 text-[#102A43] focus:border-[#1677FF]/40 outline-none mt-1 leading-relaxed text-xs placeholder-slate-300"
                    placeholder="请输入对该人员的考评、岗位建议或现场表现评价..."
                  />
                </div>
              </div>
            </div>

            {/* Calendar schedules */}
            <div className="space-y-3.5">
              <h5 className="text-[11px] font-bold text-[#7B93AA] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={12} className="text-[#F59E0B]" /> 每日空闲排班日历
              </h5>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {dateHeaders.map(date => {
                  let availMap: Record<string, string> = {};
                  try { availMap = JSON.parse(selectedRecord.availability || '{}'); } catch(e) {}
                  const stateKey = (availMap[date] as AvailabilityState) || 'EMPTY';
                  const config = STATE_CONFIG[stateKey] || STATE_CONFIG.EMPTY;
                  
                  return (
                    <div 
                      key={date} 
                      onClick={() => {
                        const nextIndex = (AVAILABILITY_STATES.indexOf(stateKey) + 1) % AVAILABILITY_STATES.length;
                        const nextState = AVAILABILITY_STATES[nextIndex];
                        const newMap = { ...availMap, [date]: nextState };
                        const updated = records.map(r => r.id === selectedRecord.id ? { ...r, availability: JSON.stringify(newMap) } : r);
                        onUpdateRecords(updated);
                        // Update current drawer selectedRecord as well to react immediately
                        setSelectedRecord({ ...selectedRecord, availability: JSON.stringify(newMap) });
                      }}
                      className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 cursor-pointer hover:shadow-xs transition-all ${config.bg} ${config.text} border-slate-100`}
                    >
                      <span className="font-bold text-[10px] text-[#102A43]">{date}</span>
                      <span className="text-[9px] scale-90 opacity-80">{config.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick action bar inside drawer */}
            <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditingRecord(selectedRecord);
                  setIsDetailDrawerOpen(false);
                  setIsEditModalOpen(true);
                }}
                className="flex-1 py-2 text-xs font-bold border-[#E5EEF8] hover:bg-slate-50 hover:border-slate-300 text-[#486581]"
              >
                修改档案
              </Button>
              {!selectedRecord.isAlreadyStaff && (
                <Button 
                  variant="primary" 
                  onClick={() => {
                    handleSinglePromote(selectedRecord);
                    setIsDetailDrawerOpen(false);
                  }}
                  className="flex-1 py-2 text-xs font-bold bg-[#1677FF] hover:bg-[#005CE6]"
                >
                  激活入职
                </Button>
              )}
            </div>

          </div>
        </DetailDrawer>
      )}

      {/* Manual upload modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsImportModalOpen(false)}>
          <div className="bg-white rounded-[14px] shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#102A43] text-sm flex items-center gap-1.5"><FileSpreadsheet size={16} className="text-emerald-500" /> 批量导入表格数据</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-[#7B93AA] hover:text-[#102A43]"><X size={16} /></button>
            </div>
            
            <div 
              className="border-2 border-dashed border-[#E5EEF8] rounded-xl p-6 text-center hover:border-[#1677FF] hover:bg-[#F8FBFF] transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
               <div className="w-12 h-12 bg-[#EAF4FF] text-[#1677FF] rounded-full flex items-center justify-center mx-auto mb-3">
                 <UploadCloud size={24} />
               </div>
               <p className="font-bold text-[#102A43] text-xs">点击选择文件并读取</p>
               <p className="text-[10px] text-[#7B93AA] mt-1">支持 UTF-8 的 CSV 格式文本文件</p>
               <input type="file" ref={fileInputRef} accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            </div>
            
            <div className="mt-4 flex justify-center">
              <button 
                onClick={handleDownloadTemplate}
                className="text-[10px] text-[#1677FF] hover:text-[#005CE6] bg-blue-50/60 border border-blue-100/40 px-3 py-1.5 rounded-[8px] font-bold flex items-center gap-1"
              >
                <Download size={12} /> 下载空白数据模板
              </button>
            </div>
            
            <div className="mt-5 bg-slate-50 p-4 rounded-xl text-[10px] text-[#7B93AA] space-y-1">
               <p className="font-bold text-[#102A43] mb-1">文件标题行字段建议包含：</p>
               <p>“姓名”、“手机号码”、“出生日期”、“性别”、“开户行”等。</p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry or Editing record dialog */}
      {isEditModalOpen && editingRecord && (
         <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsEditModalOpen(false)}>
            <div className="bg-white rounded-[14px] shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-[#102A43] text-sm">
                     {editingRecord.name ? '编辑人员档案' : '手动录入新报名人员'}
                  </h3>
                  <button onClick={() => setIsEditModalOpen(false)} className="text-[#7B93AA] hover:text-[#102A43]"><X size={16} /></button>
               </div>

               <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="text-[11px] font-bold text-[#7B93AA] block mb-1">姓名 (Name)</label>
                        <input type="text" value={editingRecord.name} onChange={e => setEditingRecord({...editingRecord, name: e.target.value})} className="w-full border border-[#E5EEF8] rounded-lg p-2 text-xs outline-none focus:border-[#1677FF]/40" />
                     </div>
                     <div>
                        <label className="text-[11px] font-bold text-[#7B93AA] block mb-1">联系手机 (Phone)</label>
                        <input type="text" value={editingRecord.phone} onChange={e => setEditingRecord({...editingRecord, phone: e.target.value})} className="w-full border border-[#E5EEF8] rounded-lg p-2 text-xs outline-none focus:border-[#1677FF]/40" />
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="text-[11px] font-bold text-[#7B93AA] block mb-1">身份证 (ID Card)</label>
                        <input type="text" value={editingRecord.idCard || ''} onChange={e => setEditingRecord({...editingRecord, idCard: e.target.value})} className="w-full border border-[#E5EEF8] rounded-lg p-2 text-xs outline-none focus:border-[#1677FF]/40" />
                     </div>
                     <div>
                        <label className="text-[11px] font-bold text-[#7B93AA] block mb-1">性别 (Gender)</label>
                        <select value={editingRecord.gender || ''} onChange={e => setEditingRecord({...editingRecord, gender: e.target.value})} className="w-full border border-[#E5EEF8] bg-white rounded-lg p-2 text-xs outline-none focus:border-[#1677FF]/40">
                           <option value="">请选择性别</option>
                           <option value="男">男</option>
                           <option value="女">女</option>
                        </select>
                     </div>
                  </div>

                  <div>
                     <label className="text-[11px] font-bold text-[#7B93AA] block mb-1">备注说明 / 开户行与工作经历</label>
                     <textarea rows={3} value={editingRecord.notes} onChange={e => setEditingRecord({...editingRecord, notes: e.target.value})} className="w-full border border-[#E5EEF8] rounded-lg p-2 text-xs outline-none focus:border-[#1677FF]/40 leading-relaxed" placeholder="可用 | 分割不同段落，例：开户行: 招商银行 | 卡号: 6225... | 经历: 曾任大型餐饮店长" />
                  </div>

                  <Button 
                     variant="primary"
                     onClick={() => {
                        if (!editingRecord.name) {
                          setToastType('error');
                          setToastMsg('姓名必填！');
                          return;
                        }
                        if(records.find(r => r.id === editingRecord.id)) {
                           onUpdateRecords(records.map(r => r.id === editingRecord.id ? editingRecord : r));
                        } else {
                           onUpdateRecords([editingRecord, ...records]);
                        }
                        setIsEditModalOpen(false);
                        setToastType('success');
                        setToastMsg('人员信息已保存成功');
                     }}
                     className="w-full py-2.5 bg-[#1677FF] hover:bg-[#005CE6] text-white font-bold rounded-lg"
                  >
                     提交保存
                  </Button>
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

      <ConfirmDialog
         isOpen={confirmState.isOpen}
         title={confirmState.title}
         message={confirmState.message}
         variant={confirmState.variant}
         onConfirm={confirmState.onConfirm}
         onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};

export default StaffRegistration;
