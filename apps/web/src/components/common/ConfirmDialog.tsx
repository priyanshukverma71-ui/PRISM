import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, Check, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="platinum-card max-w-md w-full p-6 rounded-2xl border border-graphite-border shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
              isDestructive
                ? 'bg-status-critical/15 text-status-critical border-status-critical/30'
                : 'bg-status-warning/15 text-status-warning border-status-warning/30'
            }`}
          >
            {isDestructive ? <AlertCircle size={18} /> : <AlertTriangle size={18} />}
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-silver-bright">{title}</h3>
            <p className="text-xs text-slate-muted leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-graphite-border">
          <button
            type="button"
            onClick={onCancel}
            className="platinum-button-secondary px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              isDestructive
                ? 'bg-status-critical text-white hover:bg-status-critical/90'
                : 'platinum-button-primary'
            }`}
          >
            <Check size={14} />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
export default ConfirmDialog;
