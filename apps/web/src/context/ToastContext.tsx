import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = 'info', title, message, duration = 4000 }: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        aria-live="assertive"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-3 flex items-start gap-3 ${
                isSuccess
                  ? 'bg-obsidian/95 border-status-success/40 text-silver-bright'
                  : isError
                  ? 'bg-obsidian/95 border-status-critical/40 text-silver-bright'
                  : isWarning
                  ? 'bg-obsidian/95 border-status-warning/40 text-silver-bright'
                  : 'bg-obsidian/95 border-graphite-border text-silver-bright'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 size={16} className="text-status-success" />}
                {isError && <AlertCircle size={16} className="text-status-critical" />}
                {isWarning && <AlertTriangle size={16} className="text-status-warning" />}
                {!isSuccess && !isError && !isWarning && <Info size={16} className="text-platinum" />}
              </div>

              <div className="flex-1 space-y-0.5 text-xs">
                <p className="font-semibold text-silver-bright">{toast.title}</p>
                {toast.message && <p className="text-slate-muted leading-relaxed">{toast.message}</p>}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Close notification"
                className="text-slate-muted hover:text-silver transition-colors flex-shrink-0 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
