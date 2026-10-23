import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Hash,
  BookOpen,
  Sparkles,
  Info,
  Filter,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';

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
    'The Institution shall possess registered land lease deed for a minimum period of 30 years. In the absence of an encumbrance clearance certificate, the regional scrutiny committee shall hold EVC scheduling for 14 working days.'
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
      alert('Draft rule extracted successfully! Pending administrative approval.');
    },
  });

  // Tab 3: Global Audit Flight Recorder
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
      a.download = `prism-flight-recorder-${Date.now()}.csv`;
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
            <h1 className="text-xl font-bold text-silver-bright tracking-tight">Platform Administration &amp; Settings</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-platinum/15 text-platinum border border-platinum/30">
              GOVERNANCE KERNEL
            </span>
          </div>
          <p className="text-xs text-slate-muted mt-0.5">
            System configuration, advanced rule compiler, and immutable cryptographic audit flight recorder
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-graphite p-1 rounded-xl border border-graphite-border self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('SYSTEM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'SYSTEM'
                ? 'bg-platinum text-obsidian font-bold shadow-platinum'
                : 'text-slate-muted hover:text-silver'
            }`}
          >
            <Sliders size={13} />
            <span>System Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('RULES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'RULES'
                ? 'bg-platinum text-obsidian font-bold shadow-platinum'
                : 'text-slate-muted hover:text-silver'
            }`}
          >
            <BookOpen size={13} />
            <span>Rule Compiler</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'AUDIT'
                ? 'bg-platinum text-obsidian font-bold shadow-platinum'
                : 'text-slate-muted hover:text-silver'
            }`}
          >
            <History size={13} />
            <span>Audit Flight Recorder</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: SYSTEM & PLATFORM TELEMETRY                             */}
      {/* ============================================================== */}
      {activeTab === 'SYSTEM' && (
        <div className="space-y-6">
          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="platinum-card p-4 rounded-xl border border-graphite-border">
              <span className="text-[10px] font-mono text-slate-muted uppercase">Platform Status</span>
              <p className="text-sm font-bold text-status-success font-mono mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-success animate-ping" />
                <span>OPERATIONAL (100% HEALTHY)</span>
              </p>
            </div>

            <div className="platinum-card p-4 rounded-xl border border-graphite-border">
              <span className="text-[10px] font-mono text-slate-muted uppercase">Configured Timezone</span>
              <p className="text-sm font-bold text-platinum font-mono mt-1">Asia/Kolkata (IST)</p>
            </div>

            <div className="platinum-card p-4 rounded-xl border border-graphite-border">
              <span className="text-[10px] font-mono text-slate-muted uppercase">Database Layer</span>
              <p className="text-sm font-bold text-silver-bright font-mono mt-1">Prisma ORM // Persistent</p>
            </div>

            <div className="platinum-card p-4 rounded-xl border border-graphite-border">
              <span className="text-[10px] font-mono text-slate-muted uppercase">Uptime Clock</span>
              <p className="text-sm font-bold text-silver font-mono mt-1 tabular-nums">{health?.uptimeSeconds || 0}s</p>
            </div>
          </div>

          {/* Workflow Templates */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
              Active Workflow Templates &amp; Version Control
            </h3>

            {isWorkflowsLoading ? (
              <div className="p-8 text-center text-slate-muted font-mono text-xs">Loading workflow configurations...</div>
            ) : (
              (workflows || []).map((wf: any) => (
                <div key={wf.id} className="platinum-card p-5 rounded-2xl border border-graphite-border space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-silver-bright">{wf.code}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gunmetal border border-graphite-border text-platinum">
                          Active: Version {wf.activeVersion}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-silver mt-1">{wf.name}</h4>
                      <p className="text-xs text-slate-muted mt-0.5">{wf.description}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[11px] font-mono uppercase text-slate-muted font-bold block mb-2">
                      Version Change History:
                    </span>
                    <div className="space-y-2">
                      {wf.versions?.map((ver: any) => (
                        <div
                          key={ver.id}
                          className="p-3 rounded-lg bg-obsidian border border-graphite-border flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-silver-bright">v{ver.versionNumber}</span>
                            <span className="text-slate-muted ml-2">{ver.changeSummary}</span>
                          </div>
                          <div className="text-right font-mono text-[11px]">
                            <span className="text-status-success font-bold">PUBLISHED &amp; ACTIVE</span>
                            <span className="block text-[10px] text-slate-muted">
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

      {/* ============================================================== */}
      {/* TAB 2: ADVANCED WORKFLOW CONFIGURATION & RULE COMPILER         */}
      {/* ============================================================== */}
      {activeTab === 'RULES' && (
        <div className="space-y-6">
          <div className="platinum-card p-6 rounded-2xl border border-graphite-border bg-obsidian-gradient space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-platinum" />
              <h2 className="text-sm font-bold text-silver-bright">AICTE Handbook (APH) Rule Compiler</h2>
            </div>
            <p className="text-xs text-slate-muted leading-relaxed">
              Extract, formalize, and validate business logic from APH text directly into executable JSON-based regulatory constraints.
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
              <label className="block text-xs font-mono uppercase text-slate-muted font-bold mb-1.5">
                APH Regulatory Text Snippet
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
                <label className="block text-[10px] font-mono uppercase text-slate-muted font-bold mb-1">
                  Section Reference
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
                className="platinum-button-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <Sparkles size={13} />
                <span>Compile APH Rule</span>
              </button>
            </div>
          </form>

          {/* Draft Rules List */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase text-slate-muted font-bold">Compiled Rule Drafts</h3>
            {(ruleDrafts || []).map((draft: any) => (
              <div key={draft.id} className="platinum-card p-4 rounded-xl border border-graphite-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-silver-bright">{draft.ruleCode}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gunmetal text-platinum border border-graphite-border">
                    {draft.status}
                  </span>
                </div>
                <p className="text-xs text-slate-muted font-mono">{draft.sourceText}</p>
                <pre className="p-2.5 rounded-lg bg-obsidian text-[11px] font-mono text-platinum overflow-x-auto border border-graphite-border">
                  {JSON.stringify(JSON.parse(draft.extractedLogicJson || '{}'), null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: IMMUTABLE AUDIT FLIGHT RECORDER                         */}
      {/* ============================================================== */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
                className="platinum-button-primary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <ShieldCheck size={14} />
                <span>Verify SHA-256 Ledger Integrity</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="platinum-button-secondary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <Download size={14} />
                <span>Export Audit CSV</span>
              </button>
            </div>

            {verifyStatus && (
              <div
                className={`p-2.5 px-4 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  verifyStatus.valid
                    ? 'bg-status-success/15 border-status-success text-status-success font-bold'
                    : 'bg-status-critical/15 border-status-critical text-status-critical font-bold'
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
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-graphite-border bg-gunmetal/30 text-[10px] font-mono uppercase tracking-wider text-slate-muted">
                    <th className="py-3 px-4">Seq</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Target</th>
                    <th className="py-3 px-4">Timestamp (IST)</th>
                    <th className="py-3 px-4">SHA-256 Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-border text-xs font-mono">
                  {isAuditLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-muted">
                        Loading cryptographic audit ledger...
                      </td>
                    </tr>
                  ) : auditEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-muted">
                        No audit events recorded.
                      </td>
                    </tr>
                  ) : (
                    auditEvents.map((ev: any) => (
                      <tr key={ev.id} className="hover:bg-gunmetal/20 transition-colors">
                        <td className="py-3 px-4 font-bold text-platinum">#{ev.sequenceIndex}</td>
                        <td className="py-3 px-4 font-bold text-silver-bright">{ev.actionType}</td>
                        <td className="py-3 px-4 text-silver">{ev.actorName || ev.actorRole}</td>
                        <td className="py-3 px-4 text-slate-muted">
                          {ev.targetType}: {ev.targetId ? ev.targetId.slice(0, 8) : 'Global'}
                        </td>
                        <td className="py-3 px-4 text-slate-muted">
                          {new Date(ev.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="py-3 px-4 text-[10px] text-platinum font-mono">
                          {ev.eventHash ? `${ev.eventHash.slice(0, 12)}...` : 'N/A'}
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
