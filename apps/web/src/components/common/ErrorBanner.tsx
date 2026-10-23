import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface ErrorBannerProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorBanner({
  title = "We couldn't load this information.",
  message = 'A network interruption or authorization boundary occurred. Try again or refresh the screen.',
  onRetry,
  retryLabel = 'Try again',
}: ErrorBannerProps) {
  return (
    <div className="p-4 rounded-xl bg-status-critical/10 border border-status-critical/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="text-status-critical flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-silver-bright">{title}</p>
          <p className="text-slate-muted leading-relaxed">{message}</p>
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
}
export default ErrorBanner;
