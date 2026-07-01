
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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">公告管理</h1>
        <p className="text-gray-500 text-sm">发布通知给全员或特定小组成员</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Send size={18} className="text-indigo-600" /> 发布新公告
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">发布范围</label>
              <select 
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="请输入公告标题"
              />
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">内容详情</label>
               <textarea 
                 required
                 rows={4}
                 value={content}
                 onChange={(e) => setContent(e.target.value)}
                 className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
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
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="sticky" className="text-sm text-gray-700 flex items-center gap-1 cursor-pointer">
                  <Pin size={14} /> 置顶公告
                </label>
              </div>
            )}

            <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-medium transition-colors">
              立即发布
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-gray-800">历史公告列表</h3>
          {visibleAnnouncements.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-gray-100 text-center text-gray-400">
              暂无已发布的公告
            </div>
          ) : (
            visibleAnnouncements.slice().reverse().map(announcement => (
              <div key={announcement.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative group hover:border-indigo-200 transition-colors">
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                       {announcement.isSticky && <Pin size={16} className="text-orange-500 fill-current" />}
                       <h4 className="font-bold text-gray-800">{announcement.title}</h4>
                       {announcement.targetGroupId ? (
                         <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                           <Users size={10} /> {announcement.targetGroupName}
                         </span>
                       ) : (
                         <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded border border-gray-200 flex items-center gap-1">
                           <Globe size={10} /> 全员
                         </span>
                       )}
                    </div>
                    <button 
                      onClick={() => onDeleteAnnouncement(announcement.id)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                 </div>
                 <p className="text-gray-600 text-sm mb-3 whitespace-pre-wrap">{announcement.content}</p>
                 <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-50 pt-3">
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
