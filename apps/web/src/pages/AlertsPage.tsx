import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Send,
  Mail,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';

export function AlertsPage() {
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
      alert(data.message || 'Deadline check completed');
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
    },
  });

  const handleOpenResolve = (alertItem: any) => {
    setSelectedAlert(alertItem);
    setResolutionNotes('Deficiency rectified and regulatory compliance action acknowledged.');
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
          <h2 className="text-xl font-bold text-silver-bright tracking-tight">Automated Alert & Escalation Engine</h2>
          <p className="text-xs text-slate-muted">Server-side SLA deadline monitoring, tiered escalation triggers, and multi-channel delivery logs</p>
        </div>

        <button
          onClick={() => evaluateMutation.mutate()}
          disabled={evaluateMutation.isPending}
          className="platinum-button-primary px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 self-start cursor-pointer"
        >
          <RefreshCw size={14} className={evaluateMutation.isPending ? 'animate-spin' : ''} />
          <span>{evaluateMutation.isPending ? 'Evaluating Deadlines...' : 'Trigger Deadline Evaluation'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="platinum-card p-4 rounded-xl border border-graphite-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="UNRESOLVED">Unresolved Active Alerts</option>
            <option value="RESOLVED">Resolved Archive</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical Alerts</option>
            <option value="HIGH">High Urgency</option>
            <option value="MEDIUM">Medium Attention</option>
          </select>
        </div>

        <span className="text-xs font-mono text-slate-muted">
          Showing {alerts?.length || 0} Registered Notifications
        </span>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-slate-muted font-mono text-xs">Loading automated alert feed...</div>
        ) : (alerts || []).length === 0 ? (
          <div className="platinum-card p-12 text-center text-slate-muted rounded-xl border border-graphite-border">
            <CheckCircle size={32} className="mx-auto mb-2 text-status-success" />
            <p className="text-sm font-medium text-silver">No unresolved alerts in this category</p>
          </div>
        ) : (
          alerts!.map((alt: any) => (
            <div
              key={alt.id}
              className={`platinum-card p-5 rounded-xl border transition-all ${
                alt.severity === 'CRITICAL'
                  ? 'border-status-critical/40 bg-status-critical/5'
                  : alt.severity === 'HIGH'
                  ? 'border-status-warning/40 bg-status-warning/5'
                  : 'border-graphite-border'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        alt.severity === 'CRITICAL'
                          ? 'bg-status-critical/20 text-status-critical border-status-critical/40'
                          : alt.severity === 'HIGH'
                          ? 'bg-status-warning/20 text-status-warning border-status-warning/40'
                          : 'bg-gunmetal text-silver border-graphite-border'
                      }`}
                    >
                      {alt.severity}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gunmetal text-platinum">
                      Escalation Level: {alt.escalationLevel}
                    </span>
                    <span className="text-[10px] font-mono text-slate-muted">
                      Target Role: {alt.recipientRole || 'ANY'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-silver-bright">{alt.title}</h4>
                  <p className="text-xs text-silver/80">{alt.message}</p>

                  {/* Delivery Attempts & Dispatch Channels */}
                  <div className="pt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-muted">
                    <span>Dispatched Channels:</span>
                    {alt.deliveryAttempts?.map((d: any) => (
                      <span key={d.id} className="px-2 py-0.5 rounded bg-obsidian border border-graphite-border text-silver">
                        {d.channel}: {d.status} ({d.destination})
                      </span>
                    ))}
                  </div>

                  {/* Escalation Trace */}
                  {alt.escalations && alt.escalations.length > 0 && (
                    <div className="p-2 rounded bg-obsidian border border-graphite-border text-[11px] font-mono text-status-warning">
                      <span>Escalated to {alt.escalations[0].escalatedToRole}: </span>
                      <span>{alt.escalations[0].reason}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-start md:self-center">
                  {alt.status === 'UNRESOLVED' ? (
                    <button
                      onClick={() => handleOpenResolve(alt)}
                      className="platinum-button-primary px-3 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      Resolve Alert
                    </button>
                  ) : (
                    <span className="text-xs font-mono text-status-success font-bold flex items-center gap-1">
                      <CheckCircle size={13} />
                      <span>RESOLVED</span>
                    </span>
                  )}

                  {alt.applicationId && (
                    <Link
                      to={`/applications/${alt.applicationId}`}
                      className="platinum-button-secondary p-1.5 rounded-lg text-slate-muted hover:text-silver"
                      title="Inspect Case"
                    >
                      <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolve Alert Modal */}
      {resolveModalOpen && selectedAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="platinum-card max-w-md w-full p-6 rounded-2xl border border-graphite-border space-y-4">
            <h3 className="text-sm font-bold text-silver-bright flex items-center gap-2">
              <CheckCircle size={16} className="text-status-success" />
              <span>Acknowledge & Resolve Alert</span>
            </h3>
            <p className="text-xs text-slate-muted">{selectedAlert.title}</p>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-platinum mb-1 font-mono">Operator Resolution Remarks *</label>
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
                  className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveMutation.isPending}
                  className="platinum-button-primary px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {resolveMutation.isPending ? 'Closing Alert...' : 'Mark as Resolved'}
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
