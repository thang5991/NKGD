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
    success: 'border-profit/25 bg-profit-soft',
    error: 'border-loss/25 bg-loss-soft',
    warn: 'border-amber/25 bg-surface-2',
    info: 'border-accent/25 bg-accent-soft',
  };

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 right-3 z-[120] flex w-auto flex-col gap-2 sm:bottom-5 sm:left-auto sm:right-5 sm:w-full sm:max-w-sm">
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
