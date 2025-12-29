import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'success', 
  onClose, 
  duration = 3000 
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const colors = {
    success: 'bg-green-500 border-green-700',
    error: 'bg-red-500 border-red-700',
    info: 'bg-blue-500 border-blue-700',
    warning: 'bg-yellow-500 border-yellow-700',
  };

  const icons = {
    success: <CheckCircle className="h-6 w-6" />,
    error: <AlertCircle className="h-6 w-6" />,
    info: <Info className="h-6 w-6" />,
    warning: <AlertTriangle className="h-6 w-6" />,
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-5 duration-300">
      <div className={`${colors[type]} border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 min-w-[320px] max-w-md`}>
        <div className="flex items-start gap-3">
          <div className="text-white flex-shrink-0">
            {icons[type]}
          </div>
          <p className="text-white font-bold uppercase text-sm flex-1 leading-relaxed">
            {message}
          </p>
          <button
            onClick={onClose}
            className="text-white hover:text-black transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmText = 'CONFIRM',
  cancelText = 'CANCEL',
  onConfirm,
  onCancel,
  type = 'warning',
}) => {
  const colors = {
    danger: 'bg-red-600',
    warning: 'bg-orange-600',
    info: 'bg-blue-600',
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
        <div className="mb-4">
          <h3 className="text-2xl font-black uppercase text-black mb-2">{title}</h3>
          <div className="h-1 bg-black w-16"></div>
        </div>
        
        <p className="text-stone-700 font-mono text-sm mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-white text-black border-2 border-black font-bold uppercase hover:bg-stone-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-6 py-3 ${colors[type]} text-white border-2 border-black font-bold uppercase hover:opacity-90 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

interface AlertDialogProps {
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
  type?: 'success' | 'error' | 'info' | 'warning';
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  title,
  message,
  buttonText = 'OK',
  onClose,
  type = 'success',
}) => {
  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-orange-600',
  };

  const icons = {
    success: <CheckCircle className="h-12 w-12" />,
    error: <AlertCircle className="h-12 w-12" />,
    info: <Info className="h-12 w-12" />,
    warning: <AlertTriangle className="h-12 w-12" />,
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className={`${colors[type]} p-4 border-2 border-black mb-4`}>
            <div className="text-white">
              {icons[type]}
            </div>
          </div>
          
          <h3 className="text-2xl font-black uppercase text-black mb-3">{title}</h3>
          
          <p className="text-stone-700 font-mono text-sm mb-6 leading-relaxed">
            {message}
          </p>

          <button
            onClick={onClose}
            className={`w-full px-8 py-3 ${colors[type]} text-white border-2 border-black font-bold uppercase hover:opacity-90 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};
