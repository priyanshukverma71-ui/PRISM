import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  UserCheck,
  HelpCircle,
  Wrench,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { formatPlainAlert, formatRole, safeFormatError } from '../lib/plainLanguage.js';
import { useToast } from '../context/ToastContext.js';
import { LoadingState } from '../components/common/LoadingState.js';
import { EmptyState } from '../components/common/EmptyState.js';

export function AlertsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('UNRESOLVED');
  const [severityFilter, setSeverityFilter] = useState('');

  // Resolution modal
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const queryParams = new URLSearchParams({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(severityFilter ? { severity: severityFilter } : {}),
  });

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts-feed', queryParams.toString()],
    queryFn: () => apiRequest<any[]>(`/alerts?${queryParams.toString()}`),
  });

  const evaluateMutation = useMutation({
    mutationFn: () =>
      apiRequest('/alerts/evaluate', {
        method: 'POST',
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['alerts-feed'] });
      showToast({
        type: 'success',
        title: 'Deadline check completed',
        message: data.message || 'All statutory deadlines and escalation tiers were verified.',
      });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: "We couldn't check deadlines",
        message: safeFormatError(err, 'Try again in a few moments.'),
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiRequest(`/alerts/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts-feed'] });
      setResolveModalOpen(false);
      setResolutionNotes('');
      showToast({
        type: 'success',
        title: 'Alert acknowledged and resolved',
        message: 'Your compliance review notes have been recorded in the audit trail.',
      });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: "We couldn't acknowledge the alert",
        message: safeFormatError(err, 'Try again in a few moments.'),
      });
    },
  });

  const handleOpenResolve = (alertItem: any) => {
    setSelectedAlert(alertItem);
    setResolutionNotes('Deficiency rectified and compliance action acknowledged.');
    setResolveModalOpen(true);
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    resolveMutation.mutate({
      id: selectedAlert.id,
      notes: resolutionNotes,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-silver-bright tracking-tight">System alerts</h1>
          <p className="text-xs text-slate-muted">Automated deadline monitoring, tiered escalation triggers, and notification history</p>
        </div>

        <button
          onClick={() => evaluateMutation.mutate()}
          disabled={evaluateMutation.isPending}
          className="platinum-button-primary px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 self-start cursor-pointer"
        >
          <RefreshCw size={14} className={evaluateMutation.isPending ? 'animate-spin' : ''} />
          <span>{evaluateMutation.isPending ? 'Checking...' : 'Check deadlines now'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="platinum-card p-4 rounded-xl border border-graphite-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by alert status"
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none cursor-pointer"
          >
            <option value="">All statuses</option>
            <option value="UNRESOLVED">Active alerts</option>
            <option value="RESOLVED">Resolved alerts</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label="Filter by urgency"
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none cursor-pointer"
          >
            <option value="">All severities</option>
            <option value="CRITICAL">Critical urgency</option>
            <option value="HIGH">High urgency</option>
            <option value="MEDIUM">Medium urgency</option>
          </select>
        </div>

        <span className="text-xs text-slate-muted">
          Showing {alerts?.length || 0} registered notifications
        </span>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {isLoading ? (
          <LoadingState message="Loading system alerts..." subtext="Checking active statutory triggers and escalation tiers..." rows={3} />
        ) : (alerts || []).length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="No unresolved alerts"
            description="All regulatory compliance notifications and deadline triggers are currently clear."
          />
        ) : (
          alerts!.map((alt: any) => {
            const anatomy = formatPlainAlert(alt);
            const isCritical = alt.severity === 'CRITICAL';
            const isHigh = alt.severity === 'HIGH';

            return (
              <div
                key={alt.id}
                className={`platinum-card p-5 rounded-2xl border transition-colors space-y-4 ${
                  isCritical
                    ? 'border-status-critical/50 bg-status-critical/5'
                    : isHigh
                    ? 'border-status-warning/40 bg-status-warning/5'
                    : 'border-graphite-border'
                }`}
              >
                {/* Alert Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-graphite-border pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-medium border ${
                        isCritical
                          ? 'bg-status-critical/20 text-status-critical border-status-critical/40'
                          : isHigh
                          ? 'bg-status-warning/20 text-status-warning border-status-warning/40'
                          : 'bg-gunmetal text-silver border-graphite-border'
                      }`}
                    >
                      {anatomy.urgencyText}
                    </span>
                    {anatomy.dueDate && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950/40 text-amber-300 border border-amber-800/60 flex items-center gap-1">
                        <Clock size={11} />
                        <span>Due: {anatomy.dueDate}</span>
                      </span>
                    )}
                    <span className="text-[10px] text-slate-muted">
                      Tier {alt.escalationLevel} • {new Date(alt.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {alt.status === 'UNRESOLVED' ? (
                      <button
                        onClick={() => handleOpenResolve(alt)}
                        className="platinum-button-primary px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Acknowledge alert
                      </button>
                    ) : (
                      <span className="text-xs text-status-success font-semibold flex items-center gap-1">
                        <CheckCircle size={13} />
                        <span>Resolved</span>
                      </span>
                    )}

                    {anatomy.actionUrl && (
                      <Link
                        to={anatomy.actionUrl}
                        className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{anatomy.actionLabel}</span>
                        <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Primary Alert Heading & What to do */}
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-silver-bright flex items-center gap-2">
                    <AlertCircle size={15} className={isCritical ? 'text-status-critical' : 'text-status-warning'} />
                    <span>{anatomy.issue}</span>
                  </h2>
                </div>

                {/* Next Step Action Box */}
                <div className="p-3 rounded-xl bg-graphite/40 border border-graphite-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-status-warning tracking-wider flex items-center gap-1">
                      <Wrench size={11} />
                      <span>Next step</span>
                    </span>
                    <p className="text-xs font-semibold text-silver-bright">
                      {anatomy.nextStep}
                    </p>
                  </div>
                  {anatomy.actionUrl && (
                    <Link
                      to={anatomy.actionUrl}
                      className="platinum-button-primary px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <span>{anatomy.actionLabel}</span>
                      <ArrowRight size={12} />
                    </Link>
                  )}
                </div>

                {/* Supporting Details Grid: Reason, Due Date, Owner, Why It Matters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Reason */}
                  <div className="p-3 rounded-xl bg-obsidian border border-graphite-border space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-platinum tracking-wider flex items-center gap-1.5">
                      <AlertCircle size={12} className="text-slate-muted" />
                      <span>Reason</span>
                    </span>
                    <p className="text-silver/90 leading-relaxed">
                      {anatomy.reason || anatomy.issue}
                    </p>
                  </div>

                  {/* Due Date & Timing */}
                  <div className="p-3 rounded-xl bg-obsidian border border-graphite-border space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-platinum tracking-wider flex items-center gap-1.5">
                      <Clock size={12} className="text-status-warning" />
                      <span>Due date</span>
                    </span>
                    <p className="text-silver-bright font-medium leading-relaxed">
                      {anatomy.dueDate || 'Statutory review window cutoff pending'}
                    </p>
                  </div>

                  {/* Who Owns the Next Step */}
                  <div className="p-3 rounded-xl bg-obsidian border border-graphite-border space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-platinum tracking-wider flex items-center gap-1.5">
                      <UserCheck size={12} />
                      <span>Who owns the next step</span>
                    </span>
                    <p className="text-silver-bright font-medium">
                      {anatomy.owner}
                    </p>
                  </div>

                  {/* Why It Matters */}
                  <div className="p-3 rounded-xl bg-obsidian border border-graphite-border space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-status-warning tracking-wider flex items-center gap-1.5">
                      <HelpCircle size={12} />
                      <span>Why it matters</span>
                    </span>
                    <p className="text-silver/80 leading-relaxed">
                      {anatomy.whyItMatters}
                    </p>
                  </div>
                </div>

                {/* Escalation & Delivery Trace (if any) */}
                {alt.escalations && alt.escalations.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-obsidian border border-status-warning/30 text-[11px] text-status-warning flex items-center gap-2">
                    <TrendingUp size={13} />
                    <span>
                      Escalated to {formatRole(alt.escalations[0].escalatedToRole)}: {alt.escalations[0].reason}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Resolve Alert Modal */}
      {resolveModalOpen && selectedAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="platinum-card max-w-md w-full p-6 rounded-2xl border border-graphite-border space-y-4">
            <h3 className="text-sm font-bold text-silver-bright flex items-center gap-2">
              <CheckCircle size={16} className="text-status-success" />
              <span>Acknowledge and resolve alert</span>
            </h3>
            <p className="text-xs text-slate-muted">{selectedAlert.title}</p>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-platinum mb-1">Resolution notes *</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolveModalOpen(false)}
                  className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveMutation.isPending}
                  className="platinum-button-primary px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {resolveMutation.isPending ? 'Closing...' : 'Mark as resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertsPage;
