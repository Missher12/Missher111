
import React, { useState, useEffect, useRef } from 'react';
import { ScheduleData, ScheduleRow } from '../types';
import { FileSpreadsheet, Search, Trash2, X, Check, Eye, EyeOff, Download, UploadCloud, Sun, Moon, Star, Award, Filter, Users, Calendar, Plus } from 'lucide-react';

interface StaffScheduleManagerProps {
  scheduleData: ScheduleData;
  onUpdateData: (data: ScheduleData) => void;
}

// 默认演示数据：匹配用户提供的格式
const MOCK_CSV_DATA = `编号,字母,姓名,出生日期,年龄,现居住地址,备注,"4.26\n【培训】","5.1\n【上午】","5.1\n【下午】"
1,A,敖皓阳,2006年4月15日,19,广州市黄埔区红山三路101,兼职过售卖员,√,√,
2,B,柏文锋,2002年5月8日,23,广东省东莞市大朗镇,退伍军人,,√,√
3,,包林毅,2007年12月16日,17,荔湾区黄沙大道,志愿者,,√,
4,C,蔡昊天,2006年1月6日,19,广州大学城,志愿时长100h+,,,√`;

const StaffScheduleManager: React.FC<StaffScheduleManagerProps> = ({ scheduleData, onUpdateData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTalentModalOpen, setIsTalentModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 排班工具状态
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shiftType, setShiftType] = useState<'全天' | '上午' | '下午'>('全天');

  // 视图状态：默认精简模式
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // 初始化加载演示数据
  useEffect(() => {
    if (scheduleData.rows.length === 0 && scheduleData.headers.length === 0) {
      processImport(MOCK_CSV_DATA);
    }
  }, []);

  const formatDate = (raw: string) => {
    if (!raw) return '';
    // 将 2006年4月15日 转换为 2006.04.15
    return raw.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/g, (_, y, m, d) => {
       return `${y}.${m.padStart(2, '0')}.${d.padStart(2, '0')}`;
    });
  };

  const processImport = (content: string) => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuote = false;

    // 1. 解析 CSV (处理换行符和引号)
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          currentCell += '"'; 
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if ((char === ',' || char === '\t') && !insideQuote) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\n' || char === '\r') && !insideQuote) {
        if (char === '\r' && nextChar === '\n') i++;
        currentRow.push(currentCell.trim());
        if (currentRow.length > 1 || currentRow[0] !== '') {
            rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }

    if (rows.length < 2) return; 

    // 2. 智能识别表头
    const headerRow = rows[0];
    
    // 寻找关键列的索引
    // 假设 CSV 结构: 编号, 字母, 姓名, 出生日期, 年龄, 现居住地址, 备注, ...[动态日期]...
    const idIndex = headerRow.findIndex(h => h.includes('编号'));
    const nameIndex = headerRow.findIndex(h => h.includes('姓名'));
    const dobIndex = headerRow.findIndex(h => h.includes('出生日期'));
    const ageIndex = headerRow.findIndex(h => h.includes('年龄'));
    const addressIndex = headerRow.findIndex(h => h.includes('地址'));
    const notesIndex = headerRow.findIndex(h => h.includes('备注'));

    // 如果找不到关键列，回退到默认索引
    const idx = {
      id: idIndex !== -1 ? idIndex : 0,
      name: nameIndex !== -1 ? nameIndex : 2,
      dob: dobIndex !== -1 ? dobIndex : 3,
      age: ageIndex !== -1 ? ageIndex : 4,
      address: addressIndex !== -1 ? addressIndex : 5,
      notes: notesIndex !== -1 ? notesIndex : 6,
    };

    // 识别动态表头：从“备注”列之后的所有列
    const dynamicHeaders: string[] = [];
    if (idx.notes !== -1 && idx.notes < headerRow.length - 1) {
      for (let i = idx.notes + 1; i < headerRow.length; i++) {
        // 去除引号和多余空格，保留换行符用于显示
        let cleanHeader = headerRow[i].replace(/^"|"$/g, '').trim();
        if (cleanHeader) {
          dynamicHeaders.push(cleanHeader);
        }
      }
    }

    // 3. 处理数据行
    const newRows: ScheduleRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      if (cols.length < 2) continue; // 跳过空行

      const rowId = crypto.randomUUID();
      const scheduleMap: Record<string, string> = {};

      // 填充排班数据
      dynamicHeaders.forEach((header, index) => {
        const colIndex = idx.notes + 1 + index;
        if (cols[colIndex]) {
          // 清洗数据：如果有内容且不是空，默认为打钩，或者保留原内容(如 '√')
          let val = cols[colIndex].trim();
          if (val && val !== '√' && val !== '上' && val !== '下') {
             // 如果 CSV 里填的是其他字符，统一转为 √
             val = '√'; 
          }
          scheduleMap[header] = val;
        }
      });

      const row: ScheduleRow = {
        id: rowId,
        staffId: cols[idx.id] || '',
        name: cols[idx.name] || '',
        dob: formatDate(cols[idx.dob] || ''),
        age: cols[idx.age] || '',
        address: cols[idx.address] || '',
        notes: cols[idx.notes] || '',
        managementNotes: '', 
        schedule: scheduleMap,
        isTalent: false,
        talentNotes: ''
      };

      newRows.push(row);
    }

    onUpdateData({
      headers: ['编号', '姓名', '出生日期', '年龄', '现居住地址', '备注', '管理备注'],
      dynamicHeaders: dynamicHeaders,
      rows: newRows
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      processImport(content);
      setIsImportModalOpen(false);
    };
    reader.readAsText(file); 
  };

  const handleDeleteRow = (rowId: string) => {
    if (confirm("确定要删除该人员吗？")) {
      const newRows = scheduleData.rows.filter(r => r.id !== rowId);
      onUpdateData({ ...scheduleData, rows: newRows });
    }
  };

  // 手动添加列逻辑
  const handleAddColumn = () => {
    if (!startDate) return;
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    const newHeaders = [...scheduleData.dynamicHeaders];

    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const headerName = `${month}.${day}\n【${shiftType}】`;
      
      if (!newHeaders.includes(headerName)) {
        newHeaders.push(headerName);
      }
    }

    onUpdateData({ ...scheduleData, dynamicHeaders: newHeaders });
  };

  const handleExport = () => {
    const cleanDynamicHeaders = scheduleData.dynamicHeaders.map(h => h.replace(/\n/g, ' '));
    const allHeaders = ['编号', '姓名', '出生日期', '年龄', '现居住地址', '备注', '管理备注', '是否人才', '人才备注', ...cleanDynamicHeaders];

    const csvRows = scheduleData.rows.map(row => {
      const fixedData = [
        row.staffId, row.name, row.dob, row.age, row.address, row.notes, row.managementNotes || '',
        row.isTalent ? '是' : '否', row.talentNotes || ''
      ];
      const dynamicData = scheduleData.dynamicHeaders.map(h => row.schedule[h] || '');
      
      const fullRow = [...fixedData, ...dynamicData].map(cell => {
        const stringCell = String(cell);
        if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
          return `"${stringCell.replace(/"/g, '""')}"`;
        }
        return stringCell;
      });
      return fullRow.join(',');
    });

    const csvContent = "\ufeff" + [allHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `STAFF面试表_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleRemoveColumn = (header: string) => {
    if (confirm(`确定删除列 "${header.replace('\n', ' ')}" 吗？`)) {
       const newHeaders = scheduleData.dynamicHeaders.filter(h => h !== header);
       onUpdateData({ ...scheduleData, dynamicHeaders: newHeaders });
    }
  };

  const updateManagementNotes = (rowId: string, value: string) => {
     const newRows = scheduleData.rows.map(row => row.id === rowId ? { ...row, managementNotes: value } : row);
     onUpdateData({ ...scheduleData, rows: newRows });
  };

  const updateTalentNotes = (rowId: string, value: string) => {
    const newRows = scheduleData.rows.map(row => row.id === rowId ? { ...row, talentNotes: value } : row);
    onUpdateData({ ...scheduleData, rows: newRows });
  };

  const toggleTalent = (rowId: string) => {
    const newRows = scheduleData.rows.map(row => row.id === rowId ? { ...row, isTalent: !row.isTalent } : row);
    onUpdateData({ ...scheduleData, rows: newRows });
  };

  const toggleCell = (rowId: string, header: string) => {
    const newRows = scheduleData.rows.map(row => {
      if (row.id === rowId) {
        const currentVal = row.schedule[header];
        let nextVal = '';
        if (!currentVal) nextVal = '√'; 
        else if (currentVal === '√') nextVal = '上';
        else if (currentVal === '上') nextVal = '下';
        else nextVal = ''; 
        return { ...row, schedule: { ...row.schedule, [header]: nextVal } };
      }
      return row;
    });
    onUpdateData({ ...scheduleData, rows: newRows });
  };

  const renderCellContent = (value: string) => {
    if (value === '√') return <div className="flex items-center justify-center w-full h-full bg-green-50 text-green-600 font-bold"><Check size={20} strokeWidth={3} /></div>;
    if (value === '上') return <div className="flex items-center justify-center w-full h-full bg-blue-50 text-blue-600 font-bold"><Sun size={20} /></div>;
    if (value === '下') return <div className="flex items-center justify-center w-full h-full bg-orange-50 text-orange-600 font-bold"><Moon size={20} /></div>;
    return <div className="w-full h-full"></div>;
  };

  const filteredRows = scheduleData.rows.filter(row => 
    row.name.includes(searchTerm) || row.staffId.includes(searchTerm)
  ).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
           <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">面试人员总数</p>
              <h2 className="text-2xl font-bold text-gray-800 flex items-baseline gap-2">
                 {scheduleData.rows.length}
                 <span className="text-sm text-gray-400 font-normal">人</span>
              </h2>
           </div>
           <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Users size={20} /></div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
           <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">当前搜索结果</p>
              <h2 className="text-2xl font-bold text-gray-800 flex items-baseline gap-2">
                 {filteredRows.length}
                 <span className="text-sm text-gray-400 font-normal">人</span>
              </h2>
           </div>
           <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600"><Filter size={20} /></div>
        </div>

        <div onClick={() => setIsTalentModalOpen(true)} className="bg-gradient-to-r from-yellow-500 to-orange-500 p-5 rounded-xl shadow-lg shadow-orange-200 text-white flex items-center justify-between cursor-pointer hover:shadow-xl transition-all">
           <div>
              <p className="text-yellow-100 text-xs font-bold uppercase tracking-wider mb-1">企业人才库</p>
              <h2 className="text-2xl font-bold flex items-baseline gap-2">
                 {scheduleData.rows.filter(r => r.isTalent).length}
                 <span className="text-sm text-yellow-100 font-normal">人</span>
              </h2>
           </div>
           <div className="p-3 bg-white/20 rounded-lg text-white backdrop-blur-sm"><Award size={20} /></div>
        </div>
      </div>

      {/* 控制工具栏 */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center gap-3 sticky top-16 z-20">
         
         {/* 1. 搜索与视图 */}
         <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 max-w-sm">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="搜索姓名或编号..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-gray-50 text-sm rounded-lg pl-9 pr-4 py-2.5 border border-transparent focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
               />
            </div>
            <button 
               onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
               className={`p-2.5 rounded-lg border transition-all ${isSidebarExpanded ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
               title={isSidebarExpanded ? "精简视图" : "显示完整档案"}
            >
              {isSidebarExpanded ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
         </div>

         <div className="w-px h-8 bg-gray-200 hidden md:block mx-1"></div>

         {/* 2. 手动添加排班 (可选) */}
         <div className="flex items-center gap-2 flex-1 overflow-x-auto w-full md:w-auto no-scrollbar">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
               <Calendar size={14} className="text-gray-400" />
               <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-xs border-b border-gray-300 outline-none w-24 text-gray-700" />
               <span className="text-gray-400">-</span>
               <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-xs border-b border-gray-300 outline-none w-24 text-gray-700" />
            </div>
            <select value={shiftType} onChange={(e) => setShiftType(e.target.value as any)} className="bg-gray-50 text-xs border border-gray-200 rounded-lg px-2 py-2.5 outline-none">
               <option value="全天">全天</option>
               <option value="上午">上午</option>
               <option value="下午">下午</option>
            </select>
            <button onClick={handleAddColumn} disabled={!startDate} className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap">
               <Plus size={14} /> 添加
            </button>
         </div>

         <div className="w-px h-8 bg-gray-200 hidden md:block mx-1"></div>

         {/* 3. 数据操作 */}
         <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button onClick={() => setIsImportModalOpen(true)} className="p-2.5 rounded-lg text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200" title="导入">
               <UploadCloud size={18} />
            </button>
            <button onClick={handleExport} className="p-2.5 rounded-lg text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200" title="导出">
               <Download size={18} />
            </button>
         </div>
      </div>

      {/* 表格区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden h-[calc(100vh-320px)]">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-50 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <tr>
                {/* 固定列：星标、编号、姓名 */}
                <th className="sticky left-0 top-0 z-50 bg-gray-50 border-b border-gray-200 p-3 w-[50px] text-center font-semibold text-gray-600 shadow-[1px_0_0_0_#e5e7eb]">
                  <Star size={16} className="mx-auto" />
                </th>
                <th className="sticky left-[50px] top-0 z-50 bg-gray-50 border-b border-gray-200 p-3 text-xs font-bold text-gray-600 uppercase w-[80px] text-center shadow-[1px_0_0_0_#e5e7eb]">
                  编号
                </th>
                <th className="sticky left-[130px] top-0 z-50 bg-gray-50 border-b border-gray-200 p-3 text-xs font-bold text-gray-600 uppercase w-[120px] text-center shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)]">
                  姓名
                </th>
                
                {/* 展开列：隐私信息 */}
                {isSidebarExpanded && (
                  <>
                    <th className="p-3 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase min-w-[120px] whitespace-nowrap bg-gray-50">出生日期</th>
                    <th className="p-3 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase min-w-[60px] whitespace-nowrap bg-gray-50">年龄</th>
                    <th className="p-3 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase min-w-[200px] whitespace-nowrap bg-gray-50">现居住地址</th>
                  </>
                )}

                {/* 核心列 */}
                <th className="p-3 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase min-w-[200px] bg-gray-50">备注</th>
                <th className="p-3 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase min-w-[180px] bg-gray-50">管理备注</th>

                {/* 动态日期列 */}
                {scheduleData.dynamicHeaders.map((header) => (
                  <th key={header} className="p-2 border-b border-gray-200 min-w-[90px] text-center bg-gray-50 group border-l border-gray-100">
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <span className="text-[11px] font-bold text-gray-700 whitespace-pre-line leading-tight">{header}</span>
                      <button onClick={() => handleRemoveColumn(header)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </th>
                ))}

                {/* 操作列 */}
                <th className="p-3 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase w-[80px] text-center bg-gray-50 border-l border-gray-100">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredRows.map((row) => (
                <tr key={row.id} className="group hover:bg-gray-50 transition-colors">
                  
                  {/* 固定列数据 */}
                  <td className="sticky left-0 z-40 bg-white group-hover:bg-gray-50 border-b border-gray-100 p-2 text-center shadow-[1px_0_0_0_#f3f4f6]">
                    <button onClick={() => toggleTalent(row.id)} className={`transition-all hover:scale-110 ${row.isTalent ? 'text-yellow-500' : 'text-gray-200 hover:text-yellow-400'}`}>
                      <Star size={16} className={row.isTalent ? "fill-current" : ""} />
                    </button>
                  </td>
                  <td className="sticky left-[50px] z-40 bg-white group-hover:bg-gray-50 border-b border-gray-100 p-2 text-center text-xs font-mono text-gray-400 shadow-[1px_0_0_0_#f3f4f6]">
                    {row.staffId}
                  </td>
                  <td className="sticky left-[130px] z-40 bg-white group-hover:bg-gray-50 border-b border-gray-100 p-2 text-center shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                    <span className="font-semibold text-gray-800 text-sm">{row.name}</span>
                  </td>

                  {/* 展开列数据 */}
                  {isSidebarExpanded && (
                    <>
                      <td className="p-3 text-sm text-gray-600 whitespace-nowrap">{row.dob}</td>
                      <td className="p-3 text-sm text-gray-600">{row.age}</td>
                      <td className="p-3 text-sm text-gray-600 max-w-[240px] truncate" title={row.address}>{row.address}</td>
                    </>
                  )}
                  
                  {/* 核心列数据 */}
                  <td className="p-3 text-sm text-gray-500 min-w-[200px]">
                     <p className="line-clamp-2" title={row.notes}>{row.notes || '-'}</p>
                  </td>
                  <td className="p-2 text-sm min-w-[180px]">
                     <input 
                       type="text" 
                       value={row.managementNotes || ''}
                       onChange={(e) => updateManagementNotes(row.id, e.target.value)}
                       className="w-full bg-transparent border-b border-transparent focus:border-indigo-400 outline-none text-indigo-700 text-sm py-1 px-1 transition-all placeholder-gray-300 hover:placeholder-gray-400"
                       placeholder="点击输入..."
                     />
                  </td>

                  {/* 排班打钩 */}
                  {scheduleData.dynamicHeaders.map((header) => (
                    <td key={header} className="p-0 border-b border-gray-100 border-l border-gray-50 cursor-pointer h-[52px] relative min-w-[90px]" onClick={() => toggleCell(row.id, header)}>
                      <div className="w-full h-full flex items-center justify-center hover:bg-gray-100/50 transition-colors">
                        {renderCellContent(row.schedule[header] || '')}
                      </div>
                    </td>
                  ))}

                  {/* 删除按钮 */}
                  <td className="p-2 border-b border-gray-100 border-l border-gray-50 text-center">
                    <button onClick={() => handleDeleteRow(row.id)} className="text-gray-300 hover:text-red-500 p-2 rounded hover:bg-red-50 transition-colors" title="删除该人员">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredRows.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-400 bg-gray-50/50">
                <FileSpreadsheet size={48} className="mb-4 opacity-10" />
                <p>暂无数据</p>
                <button onClick={() => setIsImportModalOpen(true)} className="text-indigo-600 text-sm mt-2 hover:underline font-medium">导入数据</button>
             </div>
          )}
        </div>
      </div>

      {/* 导入弹窗 */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">导入面试/排班表</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
               <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                 <UploadCloud size={32} className="text-blue-500" />
               </div>
               <p className="font-medium text-gray-700 mb-1">点击上传或拖拽 CSV 文件</p>
               <input type="file" ref={fileInputRef} accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            </div>
            
            <div className="mt-6 bg-gray-50 p-4 rounded-lg text-xs text-gray-500 space-y-1 border border-gray-100">
               <p className="font-bold text-gray-700 mb-2">表格格式说明：</p>
               <p>• 系统会自动识别“备注”列。</p>
               <p>• “备注”左侧为：编号、姓名、出生日期等基础信息。</p>
               <p>• “备注”<span className="text-indigo-600 font-bold">右侧的所有列</span>都会自动生成为排班日期列。</p>
               <p>• 支持自动忽略“字母”列。</p>
            </div>
          </div>
        </div>
      )}

      {/* 人才库弹窗 (保持原样) */}
      {isTalentModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-end">
           <div className="bg-white w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-yellow-50">
                 <div>
                    <h2 className="font-bold text-lg text-yellow-800 flex items-center gap-2"><Award size={20} /> 人才库</h2>
                    <p className="text-xs text-yellow-600 mt-1">已收藏 {scheduleData.rows.filter(r => r.isTalent).length} 位优秀人才</p>
                 </div>
                 <button onClick={() => setIsTalentModalOpen(false)} className="p-2 hover:bg-yellow-100 rounded-full text-yellow-700"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {scheduleData.rows.filter(r => r.isTalent).map(staff => (
                    <div key={staff.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group">
                       <div className="flex justify-between items-start mb-2">
                          <div>
                             <h3 className="font-bold text-gray-800">{staff.name}</h3>
                             <p className="text-xs text-gray-500 font-mono">ID: {staff.staffId}</p>
                          </div>
                          <button onClick={() => toggleTalent(staff.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                       </div>
                       <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-100">
                          <label className="text-[10px] font-bold text-yellow-700 uppercase mb-1 block">人才备注</label>
                          <textarea value={staff.talentNotes || ''} onChange={(e) => updateTalentNotes(staff.id, e.target.value)} className="w-full bg-transparent text-sm text-gray-800 outline-none resize-none" rows={2} />
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StaffScheduleManager;
