import React from 'react';
import { AlertCircle, Check, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CustomAlertProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  onConfirm,
  confirmText = 'OK',
  cancelText = 'Cancel',
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const getStyle = () => {
    switch (type) {
      case 'success':
        return {
          headerBg: 'bg-[#FFDBB0]', // Peach
          icon: <Check className="w-6 h-6 text-black" strokeWidth={3} />
        };
      case 'error':
        return {
          headerBg: 'bg-[#FFB0B0]', // Light Red
          icon: <AlertCircle className="w-6 h-6 text-black" strokeWidth={3} />
        };
      case 'warning':
        return {
          headerBg: 'bg-[#FFEBB0]', // Light Yellow
          icon: <AlertTriangle className="w-6 h-6 text-black" strokeWidth={3} />
        };
      default:
        return {
          headerBg: 'bg-[#B0DFFF]', // Light Blue
          icon: <Info className="w-6 h-6 text-black" strokeWidth={3} />
        };
    }
  };

  const style = getStyle();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-mono">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Alert Card */}
      <div className="relative bg-white border-4 border-black max-w-md w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] antialiased">
        {/* Header */}
        <div className={cn(
          "flex items-center px-6 py-4 border-b-4 border-black",
          style.headerBg
        )}>
          <div className="flex items-center gap-3">
            {style.icon}
            <h3 className="text-xl font-bold uppercase tracking-wide text-black">
              {title || type}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-10 text-center">
          <p className="text-black text-lg font-bold uppercase tracking-wide leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-0 flex flex-col gap-3">
          <button
            onClick={handleConfirm}
            className="w-full py-4 bg-black text-white text-lg font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors shadow-none transform active:translate-y-1"
          >
            {confirmText}
          </button>
          
          {onConfirm && (
            <button
              onClick={onClose}
              className="w-full py-4 bg-white text-black border-4 border-black text-lg font-bold uppercase tracking-widest hover:bg-stone-100 transition-colors"
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook for using custom alerts
export const useCustomAlert = () => {
  const [alertState, setAlertState] = React.useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    message: '',
  });

  const showAlert = React.useCallback((
    message: string,
    options?: {
      title?: string;
      type?: 'success' | 'error' | 'warning' | 'info';
      onConfirm?: () => void;
      confirmText?: string;
      cancelText?: string;
    }
  ) => {
    setAlertState({
      isOpen: true,
      message,
      ...options,
    });
  }, []);

  const closeAlert = React.useCallback(() => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const AlertComponent = React.useCallback(() => (
    <CustomAlert
      {...alertState}
      onClose={closeAlert}
    />
  ), [alertState, closeAlert]);

  return { showAlert, closeAlert, AlertComponent };
};
