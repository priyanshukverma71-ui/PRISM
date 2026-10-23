import React from 'react';
import { LucideIcon, Layers } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionUrl?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon: Icon = Layers,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <div className="platinum-card p-12 text-center rounded-2xl border border-graphite-border space-y-4 max-w-xl mx-auto my-6">
      <div className="w-14 h-14 rounded-2xl bg-gunmetal/60 border border-graphite-border flex items-center justify-center mx-auto text-platinum">
        <Icon size={24} />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-bold text-silver-bright">{title}</h3>
        <p className="text-xs text-slate-muted max-w-sm mx-auto leading-relaxed">{description}</p>
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="platinum-button-primary px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            >
              {actionLabel}
            </button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="platinum-button-secondary px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
export default EmptyState;
