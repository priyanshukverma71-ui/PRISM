import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  History,
  ShieldCheck,
  Download,
  AlertTriangle,
  CheckCircle,
  Hash,
  Search,
  Filter,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';

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
      a.download = `prism-flight-recorder-${Date.now()}.csv`;
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
      <div className="platinum-card p-6 rounded-2xl border border-graphite-border bg-obsidian-gradient">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gunmetal border border-graphite-border text-xs font-mono text-platinum mb-2">
              <History size={14} className="text-status-success" />
              <span>CRYPTOGRAPHIC IMMUTABLE AUDIT LOG // SHA-256 HASH CHAIN</span>
            </div>
            <h2 className="text-2xl font-bold text-silver-bright tracking-tight">Compliance Flight Recorder</h2>
            <p className="text-xs text-slate-muted max-w-2xl mt-1">
              Tamper-evident, append-only chronological event ledger. Every regulatory decision, document verification,
              and state transition is chained using SHA-256 hashes to guarantee post-hoc legal auditability.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
              className="platinum-button-primary px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-platinum"
            >
              <ShieldCheck size={14} />
              <span>{verifyMutation.isPending ? 'Verifying Hashes...' : 'Verify Crypto Chain Integrity'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="platinum-button-secondary px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Download size={14} />
              <span>Export Protected CSV</span>
            </button>
          </div>
        </div>

        {/* Live Integrity Banner */}
        {verifyStatus && (
          <div
            className={`mt-4 p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
              verifyStatus.verification?.valid
                ? 'bg-status-success/15 border-status-success/40 text-status-success'
                : 'bg-status-critical/15 border-status-critical/40 text-status-critical'
            }`}
          >
            {verifyStatus.verification?.valid ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            <span>
              {verifyStatus.verification?.valid
                ? `SUCCESS: Cryptographic verification passed across all ${verifyStatus.verification.totalEvents} sequential events. Zero tamper breaches detected.`
                : `INTEGRITY ALERT: Chain sequence broken at event #${verifyStatus.verification?.brokenIndex}. Possible external database mutation.`}
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
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none"
          >
            <option value="">All Action Types</option>
            <option value="USER_LOGIN">User Logins</option>
            <option value="APPLICATION_CREATE">Application Created</option>
            <option value="STAGE_TRANSITION">Stage Transitions</option>
            <option value="COMPLIANCE_VERIFIED">Compliance Verified</option>
            <option value="EVC_UPDATED">EVC Schedule Modified</option>
            <option value="ALERT_GENERATED">Automated Alerts</option>
            <option value="SIMULATION_RUN">Simulation Runs</option>
          </select>

          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none"
          >
            <option value="">All Targets</option>
            <option value="APPLICATION">Applications</option>
            <option value="COMPLIANCE">Compliance Obligations</option>
            <option value="EVC">EVC Committee</option>
            <option value="ALERT">Alerts</option>
            <option value="WORKFLOW_RULE">Workflow Rules</option>
          </select>
        </div>

        <span className="text-xs font-mono text-slate-muted">
          Flight Recorder: {events.length} Events In View
        </span>
      </div>

      {/* Audit Log Chronological Feed */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-slate-muted font-mono text-xs">Reading immutable ledger...</div>
        ) : events.length === 0 ? (
          <div className="platinum-card p-12 text-center text-slate-muted rounded-xl border border-graphite-border">
            <p className="text-sm font-medium text-silver">No audit records match the current filter</p>
          </div>
        ) : (
          events.map((e: any) => (
            <div key={e.id} className="platinum-card p-4 rounded-xl border border-graphite-border space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-platinum bg-gunmetal px-2 py-0.5 rounded border border-graphite-border">
                    #{e.sequenceIndex}
                  </span>
                  <span className="font-mono font-bold text-xs text-silver-bright">{e.actionType}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-obsidian border border-graphite-border text-slate-muted">
                    Target: {e.targetType}
                  </span>
                </div>

                <span className="text-[11px] font-mono text-slate-muted">
                  {new Date(e.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </span>
              </div>

              <div className="text-xs text-silver">
                <span className="font-semibold">{e.actorName}</span>{' '}
                <span className="text-slate-muted font-mono text-[10px]">({e.actorRole})</span>: {e.reason || 'Event executed'}
              </div>

              {/* SHA-256 Hash Chaining Telemetry */}
              <div className="pt-2 border-t border-graphite-border/60 grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono text-slate-muted">
                <div className="truncate">
                  <span>Current Hash: </span>
                  <span className="text-platinum">{e.currentHash}</span>
                </div>
                <div className="truncate">
                  <span>Previous Hash: </span>
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
