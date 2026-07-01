
import { AttendanceConfig, AttendanceRecord } from './types';

/**
 * Utilities for data formatting and masking
 */

export const maskPhone = (phone?: string): string => {
  if (!phone || phone.length < 7) return phone || '';
  return `${phone.substring(0, 3)}****${phone.substring(phone.length - 4)}`;
};

export const maskIdCard = (idCard?: string): string => {
  if (!idCard || idCard.length < 8) return idCard || '';
  return `${idCard.substring(0, 3)}***********${idCard.substring(idCard.length - 4)}`;
};

export const isSameDay = (d1: string | Date, d2: string | Date): boolean => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

export const getLocalDateKey = (date?: Date | string): string => {
  const d = date ? new Date(date) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const calculateAttendanceStatus = (
  type: 'IN' | 'OUT', 
  checkTime: Date, 
  config: AttendanceConfig
): AttendanceRecord['status'] => {
  // Use en-GB to strictly force HH:mm format (24h) regardless of browser locale
  const timeStr = checkTime.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' });
  
  if (type === 'IN') {
    return timeStr > config.startTime ? 'LATE' : 'NORMAL';
  } else {
    if (timeStr < config.endTime) return 'EARLY_LEAVE';
    if (timeStr > config.overtimeStart) return 'OVERTIME';
    return 'NORMAL';
  }
};
