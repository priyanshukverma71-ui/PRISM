import React from 'react';

export interface LoadingStateProps {
  message?: string;
  subtext?: string;
  rows?: number;
}

export function LoadingState({
  message = 'Loading data...',
  subtext = 'Please wait while records are fetched securely from the regulatory registry.',
  rows = 3,
}: LoadingStateProps) {
  return (
    <div className="p-8 text-center space-y-4">
      <div className="flex justify-center items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-platinum animate-ping" />
        <span className="w-2 h-2 rounded-full bg-platinum/80 animate-pulse" />
        <span className="w-2.5 h-2.5 rounded-full bg-platinum/60 animate-bounce" />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-silver-bright">{message}</p>
        {subtext && <p className="text-[11px] text-slate-muted">{subtext}</p>}
      </div>

      {rows > 0 && (
        <div className="max-w-md mx-auto space-y-2 pt-2">
          {Array.from({ length: rows }).map((_, idx) => (
            <div
              key={idx}
              className="h-9 rounded-lg bg-gunmetal/40 border border-graphite-border animate-pulse"
              style={{ animationDelay: `${idx * 150}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
export default LoadingState;
