
import React, { useMemo } from 'react';
import { QueueTicket, RegistrationRecord, Staff } from '../../types';
import QueueManager from './QueueManager';
import { ScanLine } from 'lucide-react';

interface CheckInSystemProps {
  queue: QueueTicket[];
  registrationList: RegistrationRecord[];
  onSiteRecords: RegistrationRecord[]; 
  staffList: Staff[];
  onCheckIn: (staffId: string) => void;
  onClearQueue: () => void;
  onUpdateTicketStatus: (ticketId: string, status: QueueTicket['status']) => void;
}

const CheckInSystem: React.FC<CheckInSystemProps> = ({
  queue,
  registrationList,
  onSiteRecords, 
  staffList,
  onCheckIn, 
  onClearQueue, 
  onUpdateTicketStatus
}) => {
  // Combine lists logic extracted here to ensure the scanner can find everyone
  const allPotentialAttendees = useMemo(() => {
    // Combine lists, preferring Master List info if dupe
    const combined = [...registrationList];
    
    // Add OnSite records if not already present
    onSiteRecords.forEach(os => {
      if (!combined.find(r => r.id === os.id)) {
        combined.push(os);
      }
    });

    // Also include Staff who might be PENDING (manual entry or imported)
    staffList.forEach(s => {
       // Only include if not active (candidates) and not already in the list
       if ((s.status === 'PENDING' || s.status === 'INTERVIEWED') && !combined.find(r => r.id === s.id)) {
          combined.push({
             id: s.id,
             registrationNumber: 'STAFF', // Placeholder
             name: s.name,
             phone: s.phone,
             idCard: s.idCard,
             gender: '未知',
             submissionTime: s.joinDate,
             notes: '',
             isTalent: false,
             availability: '{}',
             managementNotes: ''
          });
       }
    });
    return combined;
  }, [registrationList, onSiteRecords, staffList]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in bg-gray-50/50">
      <div className="flex items-center gap-2 pb-4 px-6 pt-4 bg-white border-b border-gray-200 shrink-0">
        <div className="p-2 bg-[#1677FF] rounded-lg text-white shadow-lg shadow-blue-100/20">
            <ScanLine size={20} />
        </div>
        <div>
            <h1 className="text-xl font-bold text-gray-800">智能核销终端</h1>
            <p className="text-xs text-gray-500">摄像头扫码或手动检索签到</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-4 md:p-6">
        <QueueManager 
            queue={queue}
            registrationList={allPotentialAttendees}
            onCheckIn={onCheckIn}
            onClearQueue={onClearQueue}
            onUpdateTicketStatus={onUpdateTicketStatus}
            pendingStaff={[]}
        />
      </div>
    </div>
  );
};

export default CheckInSystem;
