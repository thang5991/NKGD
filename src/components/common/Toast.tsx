import React from 'react';
import { useToast } from '../../hooks/useToast';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-profit shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-loss shrink-0" />,
    warn: <AlertTriangle className="w-4 h-4 text-amber shrink-0" />,
    info: <Info className="w-4 h-4 text-accent shrink-0" />,
  };

  const borders = {
    success: 'border-profit/25 bg-[#0e1710]',
    error: 'border-loss/25 bg-[#170e0e]',
    warn: 'border-amber/25 bg-[#17150e]',
    info: 'border-accent/25 bg-[#11170e]',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
            borders[toast.type]
          }`}
        >
          <div className="mt-0.5">{icons[toast.type]}</div>
          <div className="flex-1 text-xs">
            {toast.title && <div className="font-semibold text-text mb-0.5">{toast.title}</div>}
            <div className="text-muted leading-relaxed">{toast.message}</div>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-muted hover:text-text p-0.5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
