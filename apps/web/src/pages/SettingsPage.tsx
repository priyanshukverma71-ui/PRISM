import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sliders,
  Layers,
  CheckCircle,
  Plus,
  ShieldAlert,
  Server,
  Clock,
  History,
  ShieldCheck,
  Download,
  BookOpen,
  Sparkles,
  Info,
  Users,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  formatActionType,
  formatEntityType,
  formatRole,
  formatStatus,
  formatCategory,
} from '../lib/plainLanguage.js';

export function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'RULES' | 'AUDIT'>('SYSTEM');

  // Tab 1: System Telemetry & Workflows
  const { data: workflows, isLoading: isWorkflowsLoading } = useQuery({
    queryKey: ['settings-workflows'],
    queryFn: () => apiRequest<any[]>('/config/workflows'),
  });

  const { data: health } = useQuery({
    queryKey: ['platform-health'],
    queryFn: () => apiRequest<any>('/health'),
  });

  // Tab 2: Rule Compiler & Drafts
  const [inputText, setInputText] = useState(
    'The Institution shall possess registered land lease deed for a minimum period of 30 years. In the absence of an encumbrance clearance certificate, the regional review committee shall hold inspection scheduling for 14 working days.'
  );
  const [sectionRef, setSectionRef] = useState('Chapter II, Section 4.1');

  const { data: ruleDrafts } = useQuery({
    queryKey: ['rule-drafts'],
    queryFn: () => apiRequest<any[]>('/rules/drafts'),
    enabled: activeTab === 'RULES',
  });

  const extractMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest('/rules/extract', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rule-drafts'] });
      alert('Draft rule compiled successfully. Pending administrative approval.');
    },
  });

  // Tab 3: Global Audit
  const [actionFilter, setActionFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<any>(null);

  const auditQueryParams = new URLSearchParams({
    limit: '40',
    ...(actionFilter ? { actionType: actionFilter } : {}),
    ...(targetFilter ? { targetType: targetFilter } : {}),
  });

  const { data: auditData, isLoading: isAuditLoading } = useQuery({
    queryKey: ['audit-events', auditQueryParams.toString()],
    queryFn: () => apiRequest<any>(`/audit?${auditQueryParams.toString()}`),
    enabled: activeTab === 'AUDIT',
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
      a.download = `prism-audit-log-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    }
  };

  const auditEvents = auditData?.data || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-graphite-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-silver-bright tracking-tight">Settings</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gunmetal text-platinum border border-graphite-border">
              Governance kernel
            </span>
          </div>
          <p className="text-xs text-slate-muted mt-0.5">
            System configuration, approval workflow rules, and audit verification
          </p>
        </div>

        <Link
          to="/team"
          className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Users size={14} />
          <span>Team directory</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-graphite-border flex space-x-6">
        <button
          onClick={() => setActiveTab('SYSTEM')}
          className={`pb-3 text-xs font-medium transition-colors border-b-2 cursor-pointer ${
            activeTab === 'SYSTEM'
              ? 'border-platinum text-silver-bright font-semibold'
              : 'border-transparent text-slate-muted hover:text-silver'
          }`}
        >
          System status
        </button>

        <button
          onClick={() => setActiveTab('RULES')}
          className={`pb-3 text-xs font-medium transition-colors border-b-2 cursor-pointer ${
            activeTab === 'RULES'
              ? 'border-platinum text-silver-bright font-semibold'
              : 'border-transparent text-slate-muted hover:text-silver'
          }`}
        >
          Rule compiler
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`pb-3 text-xs font-medium transition-colors border-b-2 cursor-pointer ${
            activeTab === 'AUDIT'
              ? 'border-platinum text-silver-bright font-semibold'
              : 'border-transparent text-slate-muted hover:text-silver'
          }`}
        >
          Activity ledger
        </button>
      </div>

      {/* TAB 1: SYSTEM TELEMETRY & WORKFLOW CONFIG */}
      {activeTab === 'SYSTEM' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="platinum-card p-4 rounded-xl border border-graphite-border space-y-1">
              <span className="text-[10px] uppercase text-slate-muted block">Platform status</span>
              <p className="text-sm font-semibold text-status-success flex items-center gap-1.5">
                <CheckCircle size={14} />
                <span>Operational</span>
              </p>
            </div>

            <div className="platinum-card p-4 rounded-xl border border-graphite-border space-y-1">
              <span className="text-[10px] uppercase text-slate-muted block">Database engine</span>
              <p className="text-sm font-semibold text-silver font-mono">
                {health?.database || 'Embedded SQLite'}
              </p>
            </div>

            <div className="platinum-card p-4 rounded-xl border border-graphite-border space-y-1">
              <span className="text-[10px] uppercase text-slate-muted block">Timestamp timezone</span>
              <p className="text-sm font-semibold text-silver font-mono">Asia/Kolkata (IST)</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-platinum font-semibold">
              Configured review workflows
            </h3>

            {isWorkflowsLoading ? (
              <div className="p-8 text-center text-slate-muted font-mono text-xs">Loading workflow configurations...</div>
            ) : (
              (workflows || []).map((wf: any) => (
                <div key={wf.id} className="platinum-card p-5 rounded-2xl border border-graphite-border space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-xs text-silver-bright">{wf.code}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gunmetal border border-graphite-border text-platinum">
                        Version {wf.activeVersion}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-silver mt-1">{wf.name}</h4>
                    <p className="text-xs text-slate-muted mt-0.5">{wf.description}</p>
                  </div>

                  <div className="pt-2">
                    <span className="text-[11px] uppercase text-slate-muted font-medium block mb-2">
                      Version change history:
                    </span>
                    <div className="space-y-2">
                      {wf.versions?.map((ver: any) => (
                        <div
                          key={ver.id}
                          className="p-3 rounded-lg bg-obsidian border border-graphite-border flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-medium text-silver-bright">v{ver.versionNumber}</span>
                            <span className="text-slate-muted ml-2">{ver.changeSummary}</span>
                          </div>
                          <div className="text-right text-[11px]">
                            <span className="text-status-success font-medium">Published & active</span>
                            <span className="block text-[10px] text-slate-muted font-mono">
                              {new Date(ver.createdAt).toISOString().split('T')[0]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ADVANCED WORKFLOW CONFIGURATION & RULE COMPILER */}
      {activeTab === 'RULES' && (
        <div className="space-y-6">
          <div className="platinum-card p-6 rounded-2xl border border-graphite-border space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-platinum" />
              <h2 className="text-sm font-bold text-silver-bright">Handbook rule compiler</h2>
            </div>
            <p className="text-xs text-slate-muted leading-relaxed">
              Extract, formalize, and validate business logic from handbook text directly into structured regulatory constraints.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!inputText) return;
              extractMutation.mutate({ sectionText: inputText, sectionRef });
            }}
            className="platinum-card p-6 rounded-2xl border border-graphite-border space-y-4"
          >
            <div>
              <label className="block text-xs uppercase text-slate-muted font-medium mb-1.5">
                Regulatory text snippet
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={3}
                className="w-full bg-obsidian border border-graphite-border rounded-xl p-3 text-xs text-silver-bright focus:outline-none focus:border-platinum font-mono"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="w-64">
                <label className="block text-[10px] uppercase text-slate-muted font-medium mb-1">
                  Section reference
                </label>
                <input
                  type="text"
                  value={sectionRef}
                  onChange={(e) => setSectionRef(e.target.value)}
                  className="w-full bg-obsidian border border-graphite-border rounded-lg px-3 py-1.5 text-xs text-silver focus:outline-none focus:border-platinum font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={extractMutation.isPending}
                className="platinum-button-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Sparkles size={13} />
                <span>{extractMutation.isPending ? 'Compiling...' : 'Compile rule'}</span>
              </button>
            </div>
          </form>

          {/* Draft Rules List */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase text-slate-muted font-medium">Compiled rule drafts</h3>
            {(ruleDrafts || []).map((draft: any) => (
              <div key={draft.id} className="platinum-card p-4 rounded-xl border border-graphite-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-medium text-xs text-silver-bright">{draft.ruleCode}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gunmetal text-platinum border border-graphite-border">
                    {formatStatus(draft.status)}
                  </span>
                </div>
                <p className="text-xs text-slate-muted">{draft.sourceText}</p>
                <pre className="p-2.5 rounded-lg bg-obsidian text-[11px] font-mono text-platinum overflow-x-auto border border-graphite-border">
                  {JSON.stringify(JSON.parse(draft.extractedLogicJson || '{}'), null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: IMMUTABLE AUDIT FLIGHT RECORDER */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
                className="platinum-button-primary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck size={14} />
                <span>{verifyMutation.isPending ? 'Verifying...' : 'Verify log integrity'}</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="platinum-button-secondary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>

            {verifyStatus && (
              <div
                className={`p-2.5 px-4 rounded-xl border text-xs flex items-center gap-2 ${
                  verifyStatus.valid
                    ? 'bg-status-success/15 border-status-success text-status-success font-medium'
                    : 'bg-status-critical/15 border-status-critical text-status-critical font-medium'
                }`}
              >
                <CheckCircle size={14} />
                <span>{verifyStatus.message}</span>
              </div>
            )}
          </div>

          {/* Audit Events Table */}
          <div className="platinum-card rounded-2xl border border-graphite-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-graphite-border bg-gunmetal/30 text-[11px] uppercase tracking-wider text-slate-muted">
                    <th className="py-3 px-4">Sequence</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Target</th>
                    <th className="py-3 px-4">Timestamp (IST)</th>
                    <th className="py-3 px-4 font-mono">Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-border">
                  {isAuditLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-muted">
                        Reading activity ledger...
                      </td>
                    </tr>
                  ) : auditEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-muted">
                        No activity records found.
                      </td>
                    </tr>
                  ) : (
                    auditEvents.map((ev: any) => (
                      <tr key={ev.id} className="hover:bg-graphite-hover transition-colors">
                        <td className="py-3 px-4 font-medium text-platinum font-mono">#{ev.sequenceIndex}</td>
                        <td className="py-3 px-4 font-semibold text-silver-bright">{formatActionType(ev.actionType)}</td>
                        <td className="py-3 px-4 text-silver">{ev.actorName || formatRole(ev.actorRole)}</td>
                        <td className="py-3 px-4 text-slate-muted">
                          {formatEntityType(ev.targetType)}: {ev.targetId ? ev.targetId.slice(0, 8) : 'Global'}
                        </td>
                        <td className="py-3 px-4 text-slate-muted font-mono text-[11px]">
                          {new Date(ev.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="py-3 px-4 text-[10px] text-platinum font-mono">
                          {ev.eventHash ? `${ev.eventHash.slice(0, 12)}...` : 'Not applicable'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
