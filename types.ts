
export enum AttendanceStatus {
  CLOCKED_IN = 'CLOCKED_IN',
  CLOCKED_OUT = 'CLOCKED_OUT'
}

export type StaffStatus = 'PENDING' | 'INTERVIEWED' | 'ACTIVE' | 'REJECTED';

export type QueueStatus = 'WAITING' | 'CALLED' | 'COMPLETED' | 'SKIPPED';

export interface Group {
  id: string;
  name: string;
  description?: string;
}

export interface GroupRole {
  groupId: string;
  groupName: string;
  isLeader: boolean;
}

export interface Staff {
  id: string;
  name: string;
  idCard: string; // 新增：用于登录
  avatar: string;
  status: StaffStatus; 
  roles: GroupRole[];
  phone?: string;
  joinDate: string;
  // Talent Pool Fields
  isTalent?: boolean;
  talentNotes?: string;
}

export interface AttendanceConfig {
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "18:00"
  overtimeStart: string; // e.g., "19:00"
}

export interface AttendanceRecord {
  id: string;
  staffId: string; 
  timestamp: string; 
  type: 'IN' | 'OUT';
  photoUrl?: string; 
  location?: string;
  status: 'NORMAL' | 'LATE' | 'EARLY_LEAVE' | 'OVERTIME'; 
}

export interface QueueTicket {
  id: string;
  ticketNumber: string; // e.g. A001
  staffId: string;
  staffName: string;
  status: QueueStatus;
  checkInTime: string;
  calledTime?: string;
}

export interface UserSession {
  userId: string;
  role: 'ADMIN' | 'USER';
  staff?: Staff;
}

export interface InterviewQuestion {
  id: string;
  text: string;
  category: string;
  difficulty: string;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
}

export interface InterviewSession {
  id: string;
  jobTitle: string;
  candidateName: string;
  date: string;
  questions: InterviewQuestion[];
  responses: Record<string, string>;
  evaluations: Record<string, EvaluationResult>;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'NOTICE' | 'URGENT' | 'NEWS';
  targetGroupId?: string; // If undefined, it's global
  targetGroupName?: string;
  authorName: string;
  isSticky?: boolean; // Only admin can sticky
}

// Staff Schedule / Roster Management
export interface ScheduleRow {
  id: string;
  staffId: string; // 编号
  name: string;    // 姓名
  dob: string;     // 出生日期
  age: string;     // 年龄
  address: string; // 现居住地址
  notes: string;   // 备注
  managementNotes?: string; // 新增：管理备注 (Editable)
  schedule: Record<string, string>; // Dynamic columns: Key is date header, Value is content
  // Talent Pool
  isTalent?: boolean;
  talentNotes?: string;
}

export interface ScheduleData {
  headers: string[]; // All headers including fixed ones
  dynamicHeaders: string[]; // Only the date/shift headers
  rows: ScheduleRow[];
}