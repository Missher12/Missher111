import React, { useEffect } from 'react';
import { Check, X, AlertCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';

// ==========================================
// 1. STYLE VARIABLES & COMPONENT CLASSES
// ==========================================
// Primary Background: bg-white
// Secondary Soft Bg: bg-[#F8FBFF]
// Primary Blue: text-[#1677FF] / bg-[#1677FF]
// Deep Blue Text: text-[#102A43]
// Body Text: text-[#486581]
// Auxiliary Text: text-[#7B93AA]
// Border: border-[#E5EEF8]
// Hover Light Blue: bg-[#EAF4FF]

// ==========================================
// 2. STATUS BADGE
// ==========================================
interface StatusBadgeProps {
  type: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, children }) => {
  const styles = {
    success: 'bg-emerald-50 text-[#22A06B] border border-emerald-100',
    warning: 'bg-amber-50 text-[#F59E0B] border border-amber-100',
    danger: 'bg-rose-50 text-[#E5484D] border border-rose-100',
    info: 'bg-blue-50 text-[#1677FF] border border-blue-100',
    neutral: 'bg-slate-50 text-[#7B93AA] border border-[#E5EEF8]',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-[10px] leading-none ${styles[type]}`}>
      {children}
    </span>
  );
};

// ==========================================
// 3. BRAND BUTTON
// ==========================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  children, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-1.5 font-semibold transition-all duration-200 rounded-[10px] active:scale-98 select-none';
  
  const variants = {
    primary: 'bg-[#1677FF] text-white hover:bg-[#005CE6] shadow-sm shadow-[#1677FF]/10 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none',
    secondary: 'bg-[#F8FBFF] text-[#486581] border border-[#E5EEF8] hover:bg-[#EAF4FF] hover:text-[#1677FF] disabled:bg-slate-50 disabled:text-slate-300',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-500/10 disabled:bg-rose-200',
    success: 'bg-[#22A06B] text-white hover:bg-[#1b8256] shadow-sm disabled:bg-emerald-200',
    ghost: 'bg-transparent text-[#486581] hover:bg-[#F8FBFF] hover:text-[#102A43] disabled:text-slate-300',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
};

// ==========================================
// 4. SURFACE CONTAINER CARD
// ==========================================
interface SurfaceCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const SurfaceCard: React.FC<SurfaceCardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white border border-[#E5EEF8] rounded-[14px] shadow-sm hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-[#1677FF]/40' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

// ==========================================
// 5. METRIC CARD (BENTO)
// ==========================================
interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isUp?: boolean;
  };
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  description, 
  icon, 
  trend,
  className = '' 
}) => {
  return (
    <SurfaceCard className={`p-5 flex flex-col justify-between ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-[#7B93AA] uppercase tracking-wider">{title}</span>
          <h3 className="text-2xl font-bold text-[#102A43] mt-1 tracking-tight leading-none">{value}</h3>
        </div>
        <div className="p-3 bg-[#F8FBFF] text-[#1677FF] rounded-[12px]">
          {icon}
        </div>
      </div>
      {(description || trend) && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#E5EEF8]">
          <span className="text-xs text-[#7B93AA] truncate">{description}</span>
          {trend && (
            <span className={`text-[11px] font-bold flex items-center gap-0.5 ${trend.isUp ? 'text-[#22A06B]' : 'text-[#E5484D]'}`}>
              {trend.value}
            </span>
          )}
        </div>
      )}
    </SurfaceCard>
  );
};

// ==========================================
// 6. PAGE HEADER WITH BREADCRUMBS
// ==========================================
interface PageHeaderProps {
  parent?: string;
  current: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  parent, 
  current, 
  title, 
  description, 
  action 
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 select-none bg-white p-5 rounded-[14px] border border-[#E5EEF8] shadow-sm">
      <div className="space-y-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-[#7B93AA] font-medium">
          {parent && (
            <>
              <span className="hover:text-[#102A43] transition-colors cursor-pointer">{parent}</span>
              <span className="text-slate-300">/</span>
            </>
          )}
          <span className="text-[#1677FF] font-semibold">{current}</span>
        </div>
        {/* Title */}
        <div className="pt-0.5">
          <h1 className="text-xl font-bold text-[#102A43] tracking-tight">{title}</h1>
          {description && <p className="text-xs text-[#7B93AA] mt-1">{description}</p>}
        </div>
      </div>
      {action && (
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          {action}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 7. TOAST NOTIFICATION CONTAINER (CUSTOM ALERT)
// ==========================================
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  onClose, 
  duration = 3000 
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <Check size={16} className="text-emerald-500" />,
    error: <X size={16} className="text-rose-500" />,
    warning: <AlertTriangle size={16} className="text-amber-500" />,
    info: <Info size={16} className="text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-[#F0FDF4] border-emerald-150 text-emerald-800',
    error: 'bg-[#FEF2F2] border-rose-150 text-rose-800',
    warning: 'bg-[#FFFBEB] border-amber-150 text-amber-800',
    info: 'bg-[#EFF6FF] border-blue-150 text-blue-800',
  };

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-[12px] shadow-lg border animate-fade-in ${bgColors[type]}`}>
      <div className="p-1 rounded-full bg-white/80 shrink-0">
        {icons[type]}
      </div>
      <p className="text-xs font-semibold leading-relaxed max-w-xs">{message}</p>
      <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors ml-2">
        <X size={12} />
      </button>
    </div>
  );
};

// ==========================================
// 8. UNIFIED CONFIRM DIALOG
// ==========================================
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const btnVariants = {
    primary: 'primary' as const,
    danger: 'danger' as const,
    warning: 'primary' as const,
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[18px] shadow-xl w-full max-w-sm overflow-hidden border border-[#E5EEF8] animate-fade-in">
        {/* Header */}
        <div className="p-5 border-b border-slate-50 flex items-center gap-3">
          <div className={`p-2 rounded-full shrink-0 ${variant === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-[#1677FF]'}`}>
            <AlertCircle size={18} />
          </div>
          <h3 className="text-sm font-bold text-[#102A43]">{title}</h3>
        </div>
        
        {/* Content */}
        <div className="p-5">
          <p className="text-xs text-[#486581] leading-relaxed">{message}</p>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50/50 border-t border-[#E5EEF8] flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant={btnVariants[variant]} size="sm" onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 9. REUSABLE DETAIL DRAWER / POPUP
// ==========================================
interface DetailDrawerProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({ 
  isOpen, 
  title, 
  onClose, 
  children 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#E5EEF8] animate-fade-in">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <h3 className="text-sm font-bold text-[#102A43]">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>
        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 10. REUSABLE EMPTY STATE
// ==========================================
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  description, 
  action 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#E5EEF8] bg-slate-50/10 rounded-[14px]">
      <div className="p-4 bg-slate-50 text-[#7B93AA] rounded-full mb-3 shrink-0">
        <Info size={28} />
      </div>
      <h4 className="text-xs font-bold text-[#102A43] mb-1">{title}</h4>
      {description && <p className="text-[11px] text-[#7B93AA] max-w-xs mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};
