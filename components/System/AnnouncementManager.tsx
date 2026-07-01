
import React, { useState } from 'react';
import { Announcement, GroupRole } from '../../types';
import { Megaphone, Pin, Trash2, Send, Users, Globe } from 'lucide-react';

interface AnnouncementManagerProps {
  currentUserRole: 'ADMIN' | 'USER';
  currentUserGroups: GroupRole[]; // Only pass groups where isLeader is true
  announcements: Announcement[];
  onAddAnnouncement: (announcement: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  currentUserName: string;
}

const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({ 
  currentUserRole, 
  currentUserGroups, 
  announcements, 
  onAddAnnouncement, 
  onDeleteAnnouncement,
  currentUserName
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetGroupId, setTargetGroupId] = useState<string>('GLOBAL');
  const [isSticky, setIsSticky] = useState(false);

  // Filter announcements: Admin sees all, Leader sees Global + Their Groups
  const visibleAnnouncements = announcements.filter(a => {
    if (currentUserRole === 'ADMIN') return true;
    if (!a.targetGroupId) return true; // Global
    return currentUserGroups.some(g => g.groupId === a.targetGroupId);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let targetGroupInfo = undefined;
    let targetGroupName = undefined;

    if (targetGroupId !== 'GLOBAL') {
      const group = currentUserGroups.find(g => g.groupId === targetGroupId);
      if (group) {
        targetGroupInfo = group.groupId;
        targetGroupName = group.groupName;
      }
    }

    const newAnnouncement: Announcement = {
      id: crypto.randomUUID(),
      title,
      content,
      date: new Date().toISOString().split('T')[0],
      type: isSticky ? 'URGENT' : 'NOTICE',
      authorName: currentUserName,
      targetGroupId: targetGroupInfo,
      targetGroupName: targetGroupName,
      isSticky: currentUserRole === 'ADMIN' ? isSticky : false
    };

    onAddAnnouncement(newAnnouncement);
    setTitle('');
    setContent('');
    setIsSticky(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-2.5">
         <div className="p-2.5 bg-blue-50 rounded-xl text-[#1677FF]">
            <Megaphone size={20} />
         </div>
         <div>
            <h1 className="text-lg font-extrabold text-[#0c2f42]">公告通知</h1>
            <p className="text-xs text-slate-400">发布通知给全员或特定小组成员</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5EEF8] hover:shadow-md transition-all duration-300 h-fit">
          <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <Send size={16} className="text-[#1677FF]" /> 发布新公告
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">发布范围</label>
              <select 
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-sm outline-none focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all duration-300 cursor-pointer"
              >
                {currentUserRole === 'ADMIN' && (
                  <option value="GLOBAL">全员可见 (Global)</option>
                )}
                {currentUserGroups.map(g => (
                  <option key={g.groupId} value={g.groupId}>仅发给：{g.groupName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">标题</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-sm outline-none focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all duration-300"
                placeholder="请输入公告标题"
              />
            </div>

            <div>
               <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">内容详情</label>
               <textarea 
                 required
                 rows={4}
                 value={content}
                 onChange={(e) => setContent(e.target.value)}
                 className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-sm outline-none focus:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all duration-300 resize-none"
                 placeholder="请输入公告内容..."
               />
            </div>

            {currentUserRole === 'ADMIN' && targetGroupId === 'GLOBAL' && (
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="sticky" 
                  checked={isSticky}
                  onChange={(e) => setIsSticky(e.target.checked)}
                  className="rounded text-[#1677FF] focus:ring-[#1677FF] cursor-pointer"
                />
                <label htmlFor="sticky" className="text-xs font-bold text-slate-600 flex items-center gap-1 cursor-pointer">
                  <Pin size={12} className="rotate-45" /> 置顶公告
                </label>
              </div>
            )}

            <button type="submit" className="w-full bg-[#1677FF] text-white py-2.5 rounded-xl hover:bg-[#0B5FCC] font-extrabold text-sm transition-all shadow-sm shadow-blue-100/20">
              立即发布
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-extrabold text-slate-800 flex items-center gap-2 mb-2">历史公告列表</h3>
          {visibleAnnouncements.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-[#E5EEF8] text-center text-slate-400 shadow-sm">
              暂无已发布的公告
            </div>
          ) : (
            visibleAnnouncements.slice().reverse().map(announcement => (
              <div key={announcement.id} className="bg-white p-5 rounded-2xl border border-[#E5EEF8] shadow-sm relative group hover:border-blue-100 hover:shadow-md transition-all duration-300">
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                       {announcement.isSticky && <Pin size={14} className="text-rose-500 fill-current" />}
                       <h4 className="font-extrabold text-slate-800 text-sm">{announcement.title}</h4>
                       {announcement.targetGroupId ? (
                         <span className="bg-blue-50 text-[#1677FF] text-[10px] px-2 py-0.5 rounded-md border border-blue-100/50 flex items-center gap-1 font-bold">
                           <Users size={10} /> {announcement.targetGroupName}
                         </span>
                       ) : (
                         <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-md border border-slate-200/50 flex items-center gap-1 font-bold">
                           <Globe size={10} /> 全员
                         </span>
                       )}
                    </div>
                    <button 
                      onClick={() => onDeleteAnnouncement(announcement.id)}
                      className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-slate-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                 </div>
                 <p className="text-slate-600 text-xs md:text-sm mb-3 whitespace-pre-wrap leading-relaxed">{announcement.content}</p>
                 <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-50 pt-3 font-medium">
                    <span>发布人: {announcement.authorName}</span>
                    <span>{announcement.date}</span>
                 </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementManager;
