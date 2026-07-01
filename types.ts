
export interface AdminUser {
  username: string;
  password: string;
}

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
  registrationNumber?: string; // New: Display ID from the master table
}

export interface AttendanceConfig {
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "18:00"
  overtimeStart: string; // e.g., "19:00"
}

export interface LoginConfig {
  title: string;
  subtitle: string;
  imageUrl: string; // Fallback or global image
  logoUrl?: string; // New: Custom logo icon
  // Specific backgrounds
  candidateBg?: string;
  staffBg?: string;
  adminBg?: string;
  // Feature Toggles
  enableCandidateLogin?: boolean; // Controls visibility of the candidate tab
}

export interface RegistrationConfig {
  masterPrefix: string; // e.g. "M"
  onSitePrefix: string; // e.g. "S"
}

export interface PermissionSettings {
  allowLeaderExport: boolean;
  allowLeaderBroadcast: boolean;
  allowStaffViewTeam: boolean;
  showSensitiveInfo: boolean;
  enableCheckIn: boolean; // Controls global visibility of scanning/check-in features
}

export interface AttendanceRecord {
  id: string;
  staffId: string; 
  timestamp: string; 
  type: 'IN' | 'OUT';
  photoUrl?: string; 
  location?: string;
  status: 'NORMAL' | 'LATE' | 'EARLY_LEAVE' | 'OVERTIME'; 
  isManual?: boolean;
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
  token?: string; // Backend Integration: JWT Token
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

// New Registration Record Type (Legacy, kept for compatibility with existing imports)
export interface RegistrationRecord {
  id: string;
  registrationNumber: string; 
  name: string;               
  gender?: string;            
  phone?: string;             
  idCard?: string;            
  position?: string;          
  submissionTime: string;     
  dob?: string;               
  age?: string;               
  address?: string;           
  notes?: string;             
  managementNotes?: string;   
  availability?: string;      
  isTalent?: boolean;         
}

// --- Backend Integration Types ---

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  success: boolean;
}

export interface PaginatedList<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
