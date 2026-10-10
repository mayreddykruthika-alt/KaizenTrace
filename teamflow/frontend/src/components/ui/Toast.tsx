import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  const typeConfig = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
    },
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      icon: <AlertCircle className="h-5 w-5 text-rose-600" />,
    },
    info: {
      bg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      icon: <Info className="h-5 w-5 text-indigo-600" />,
    },
  }[toast.type];

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-200">
      <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${typeConfig.bg}`}>
        <div className="flex-shrink-0 pt-0.5">{typeConfig.icon}</div>
        <div className="flex-1 min-w-0">
          {toast.title && <h4 className="text-sm font-semibold mb-0.5">{toast.title}</h4>}
          <p className="text-xs leading-relaxed">{toast.message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
