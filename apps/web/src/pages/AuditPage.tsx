import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  History,
  ShieldCheck,
  Download,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import {
  formatActionType,
  formatEntityType,
  formatRole,
} from '../lib/plainLanguage.js';

export function AuditPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<any>(null);

  const queryParams = new URLSearchParams({
    limit: '40',
    ...(actionFilter ? { actionType: actionFilter } : {}),
    ...(targetFilter ? { targetType: targetFilter } : {}),
  });

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit-events', queryParams.toString()],
    queryFn: () => apiRequest<any>(`/audit?${queryParams.toString()}`),
  });

  const verifyMutation = useMutation({
    mutationFn: () => apiRequest<any>('/audit/verify'),
    onSuccess: (data) => {
      setVerifyStatus(data);
    },
  });

  const handleExportCsv = async () => {
    try {
      const csvText = await apiRequest<string>('/audit/export');
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prism-activity-log-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    }
  };

  const events = auditData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="platinum-card p-6 rounded-2xl border border-graphite-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gunmetal border border-graphite-border text-xs text-platinum mb-2">
              <History size={14} className="text-status-success" />
              <span>Immutable activity record</span>
            </div>
            <h1 className="text-2xl font-bold text-silver-bright tracking-tight">Activity history</h1>
            <p className="text-xs text-slate-muted max-w-2xl mt-1 leading-relaxed">
              Tamper-evident, chronological event ledger. Every regulatory decision, document verification,
              and state transition is verified with cryptographic SHA-256 hashes to guarantee complete legal auditability.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
              className="platinum-button-primary px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck size={14} />
              <span>{verifyMutation.isPending ? 'Verifying...' : 'Verify log integrity'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="platinum-button-secondary px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Live Integrity Banner */}
        {verifyStatus && (
          <div
            className={`mt-4 p-3 rounded-lg border text-xs flex items-center gap-2 ${
              verifyStatus.verification?.valid
                ? 'bg-status-success/15 border-status-success/40 text-status-success'
                : 'bg-status-critical/15 border-status-critical/40 text-status-critical'
            }`}
          >
            {verifyStatus.verification?.valid ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            <span>
              {verifyStatus.verification?.valid
                ? `Cryptographic verification passed across all ${verifyStatus.verification.totalEvents} sequential events. Zero tampering detected.`
                : `Sequence alert: hash broken at event #${verifyStatus.verification?.brokenIndex}. Possible external mutation.`}
            </span>
          </div>
        )}
      </div>

      {/* Filter Strip */}
      <div className="platinum-card p-4 rounded-xl border border-graphite-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            aria-label="Filter by action type"
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none cursor-pointer"
          >
            <option value="">All action types</option>
            <option value="USER_LOGIN">User logins</option>
            <option value="APPLICATION_CREATE">Application created</option>
            <option value="STAGE_TRANSITION">Stage transitions</option>
            <option value="COMPLIANCE_VERIFIED">Document verified</option>
            <option value="EVC_UPDATED">Inspection schedule updated</option>
            <option value="ALERT_GENERATED">Automated alerts</option>
            <option value="SIMULATION_RUN">Simulation runs</option>
          </select>

          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            aria-label="Filter by target"
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none cursor-pointer"
          >
            <option value="">All targets</option>
            <option value="APPLICATION">Applications</option>
            <option value="COMPLIANCE">Compliance requirements</option>
            <option value="EVC">Inspection committee</option>
            <option value="ALERT">Alerts</option>
            <option value="WORKFLOW_RULE">Workflow rules</option>
          </select>
        </div>

        <span className="text-xs text-slate-muted">
          Showing {events.length} recorded events
        </span>
      </div>

      {/* Audit Log Chronological Feed */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-slate-muted font-mono text-xs">Reading activity ledger...</div>
        ) : events.length === 0 ? (
          <div className="platinum-card p-12 text-center text-slate-muted rounded-xl border border-graphite-border">
            <p className="text-sm font-medium text-silver">No activity records match the current filter</p>
          </div>
        ) : (
          events.map((e: any) => (
            <div key={e.id} className="platinum-card p-4 rounded-xl border border-graphite-border space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-platinum bg-gunmetal px-2 py-0.5 rounded border border-graphite-border">
                    #{e.sequenceIndex}
                  </span>
                  <span className="font-semibold text-xs text-silver-bright">{formatActionType(e.actionType)}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-obsidian border border-graphite-border text-slate-muted">
                    Target: {formatEntityType(e.targetType)}
                  </span>
                </div>

                <span className="text-[11px] font-mono text-slate-muted">
                  {new Date(e.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </span>
              </div>

              <div className="text-xs text-silver">
                <span className="font-medium">{e.actorName}</span>{' '}
                <span className="text-slate-muted text-[11px]">({formatRole(e.actorRole)})</span>: {e.reason || 'Event executed'}
              </div>

              {/* SHA-256 Hash Chaining Telemetry */}
              <div className="pt-2 border-t border-graphite-border/60 grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono text-slate-muted">
                <div className="truncate">
                  <span>Current hash: </span>
                  <span className="text-platinum">{e.currentHash}</span>
                </div>
                <div className="truncate">
                  <span>Previous hash: </span>
                  <span className="text-slate-muted">{e.previousHash}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AuditPage;
