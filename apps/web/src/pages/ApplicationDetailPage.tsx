import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileText,
  UserCheck,
  ArrowRight,
  RotateCcw,
  CheckCircle,
  XCircle,
  Upload,
  Send,
  History,
  Info,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { formatPlainStage, formatPlainComplianceStatus, formatDaysRemaining } from '../lib/plainLanguage.js';

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'evc' | 'compliance' | 'documents' | 'audit'>('overview');

  // Modal States
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [targetStage, setTargetStage] = useState('');
  const [transitionComments, setTransitionComments] = useState('');

  // Evidence Submit Modal
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedObligationId, setSelectedObligationId] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState(1048576);

  const { data: app, isLoading, error } = useQuery({
    queryKey: ['application', id],
    queryFn: () => apiRequest<any>(`/applications/${id}`),
    enabled: !!id,
  });

  const transitionMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest(`/applications/${id}/transition`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      setTransitionModalOpen(false);
      setTransitionComments('');
    },
  });

  const returnMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest(`/applications/${id}/return`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      setReturnModalOpen(false);
      setReturnReason('');
    },
  });

  const submitEvidenceMutation = useMutation({
    mutationFn: ({ obligationId, body }: { obligationId: string; body: any }) =>
      apiRequest(`/compliance/${obligationId}/submit`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      setEvidenceModalOpen(false);
      setUploadFileName('');
    },
  });

  const verifyEvidenceMutation = useMutation({
    mutationFn: ({ obligationId, submissionId, status, comments }: any) =>
      apiRequest(`/compliance/${obligationId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ submissionId, status, comments }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-muted font-mono text-xs">Loading case dossier...</div>;
  }

  if (error || !app) {
    return (
      <div className="p-8 text-center text-status-critical bg-graphite border border-status-critical/30 rounded-xl">
        <AlertTriangle size={32} className="mx-auto mb-2" />
        <p className="font-mono text-sm">{(error as any)?.message || 'Application not found or unauthorized'}</p>
        <Link to="/applications" className="mt-4 inline-block text-xs text-platinum underline">
          Return to Applications Inventory
        </Link>
      </div>
    );
  }

  // Determine allowed transitions based on current stage
  const getNextStageOptions = (currentStage: string) => {
    switch (currentStage) {
      case 'DRAFT':
        return [{ stage: 'SUBMITTED', action: 'SUBMIT_APPLICATION', label: 'Submit Application to Regional Office' }];
      case 'SUBMITTED':
        return [{ stage: 'UNDER_SCRUTINY', action: 'START_SCRUTINY', label: 'Commence Regional Scrutiny' }];
      case 'UNDER_SCRUTINY':
        return [
          { stage: 'EVC_PENDING', action: 'CLEAR_FOR_EVC', label: 'Clear Scrutiny & Queue for EVC' },
          { stage: 'AWAITING_DECISION', action: 'SCRUTINY_RECOMMEND_DECISION', label: 'Forward Directly to Decision' },
        ];
      case 'CLARIFICATION_REQUIRED':
        return [{ stage: 'RESUBMITTED', action: 'RESUBMIT_REMEDY', label: 'Resubmit Rectified Documents' }];
      case 'RESUBMITTED':
        return [{ stage: 'UNDER_SCRUTINY', action: 'RESUME_SCRUTINY', label: 'Re-open Scrutiny Verification' }];
      case 'EVC_PENDING':
        return [{ stage: 'EVC_SCHEDULED', action: 'SCHEDULE_EVC', label: 'Confirm EVC Schedule' }];
      case 'EVC_SCHEDULED':
        return [{ stage: 'EVC_COMPLETED', action: 'SUBMIT_EVC_REPORT', label: 'Submit EVC Inspection Report' }];
      case 'EVC_COMPLETED':
        return [
          { stage: 'COMMITTEE_REVIEW', action: 'REFER_TO_COMMITTEE', label: 'Refer to SAC / Hearing Committee' },
          { stage: 'AWAITING_DECISION', action: 'BYPASS_COMMITTEE_TO_DECISION', label: 'Recommend for Competent Approval' },
        ];
      case 'COMMITTEE_REVIEW':
        return [{ stage: 'AWAITING_DECISION', action: 'SUBMIT_COMMITTEE_RECOMMENDATION', label: 'Concur Committee Recommendation' }];
      case 'AWAITING_DECISION':
        return [
          { stage: 'APPROVED', action: 'GRANT_APPROVAL', label: 'Grant Statutory Approval (Issue EoA)' },
          { stage: 'REJECTED', action: 'ISSUE_REJECTION', label: 'Issue Statutory Rejection' },
        ];
      default:
        return [];
    }
  };

  const nextOptions = getNextStageOptions(app.currentStage);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/applications"
            className="p-2 rounded-lg bg-graphite border border-graphite-border hover:bg-gunmetal text-slate-muted hover:text-silver"
          >
            <ChevronLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-silver-bright">{app.applicationNumber}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gunmetal border border-graphite-border text-platinum">
                {(app.category || '').replace(/_/g, ' ')}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  app.riskCategory === 'CRITICAL'
                    ? 'bg-status-critical/20 text-status-critical border-status-critical/40'
                    : app.riskCategory === 'HIGH'
                    ? 'bg-status-warning/20 text-status-warning border-status-warning/40'
                    : 'bg-gunmetal text-silver border-graphite-border'
                }`}
              >
                Risk: {app.riskScore} [{app.riskCategory}]
              </span>
            </div>
            <p className="text-xs text-slate-muted mt-0.5">
              {app.institution.name} ({app.institution.code}) • {app.region} Region
            </p>
          </div>
        </div>

        {/* Operational Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Transition Button */}
          {nextOptions.length > 0 && (
            <button
              onClick={() => {
                setTargetStage(nextOptions[0].stage);
                setTransitionModalOpen(true);
              }}
              className="platinum-button-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <ArrowRight size={14} />
              <span>Advance Workflow</span>
            </button>
          )}

          {/* Return Application Button (Officers/Admins) */}
          {(user?.role === 'REGIONAL_OFFICER' || user?.role === 'BUREAU_OFFICER' || user?.role === 'SYSTEM_ADMIN') &&
            app.currentStage !== 'CLARIFICATION_REQUIRED' &&
            app.status !== 'APPROVED' &&
            app.status !== 'REJECTED' && (
              <button
                onClick={() => setReturnModalOpen(true)}
                className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-status-warning border-status-warning/30 hover:border-status-warning"
              >
                <RotateCcw size={13} />
                <span>Return with Deficiency</span>
              </button>
            )}

          {/* Simulation Shortcut */}
          <Link
            to={`/futurelab?appId=${app.id}`}
            className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-platinum"
          >
            <span>Simulate Delays (FutureLab)</span>
          </Link>
        </div>
      </div>

      {/* Case Metadata Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="platinum-card p-3 rounded-lg border border-graphite-border">
          <span className="text-[10px] font-mono text-slate-muted uppercase">Processing Stage</span>
          <p className="text-sm font-bold text-silver-bright font-mono mt-0.5">{formatPlainStage(app.currentStage)}</p>
        </div>
        <div className="platinum-card p-3 rounded-lg border border-graphite-border">
          <span className="text-[10px] font-mono text-slate-muted uppercase">Stage SLA Deadline</span>
          <p className="text-sm font-bold text-platinum font-mono mt-0.5">
            {app.deadlineDate ? new Date(app.deadlineDate).toISOString().split('T')[0] : 'Open Schedule'}
          </p>
        </div>
        <div className="platinum-card p-3 rounded-lg border border-graphite-border">
          <span className="text-[10px] font-mono text-slate-muted uppercase">Workflow Protocol</span>
          <p className="text-sm font-bold text-silver font-mono mt-0.5">{app.workflowTemplate?.name || 'Standard'}</p>
        </div>
        <div className="platinum-card p-3 rounded-lg border border-graphite-border">
          <span className="text-[10px] font-mono text-slate-muted uppercase">Case Status</span>
          <p className="text-sm font-bold text-status-success font-mono mt-0.5">{app.status}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-graphite-border flex space-x-6">
        {[
          { key: 'overview', label: 'Case Dossier' },
          { key: 'history', label: `Stage History (${app.stageHistories?.length || 0})` },
          { key: 'evc', label: `EVC Inspection (${app.evcVisits?.length || 0})` },
          { key: 'compliance', label: `Obligations & Undertakings (${app.complianceObligations?.length || 0})` },
          { key: 'documents', label: `Prescribed Documents (${app.documentRecords?.length || 0})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`pb-3 text-xs font-mono font-medium transition-colors border-b-2 ${
              activeTab === t.key
                ? 'border-platinum text-silver-bright font-bold'
                : 'border-transparent text-slate-muted hover:text-silver'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Risk Factors Explanation */}
          <div className="platinum-card p-5 rounded-xl border border-graphite-border space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold flex items-center gap-2">
              <ShieldCheck size={14} className="text-platinum" />
              <span>Delay Risk Factor Breakdown (Deterministic Engine)</span>
            </h3>
            <div className="space-y-2">
              {app.riskFactors && app.riskFactors.length > 0 ? (
                app.riskFactors.map((f: string, idx: number) => (
                  <div key={idx} className="p-2.5 rounded bg-obsidian border border-graphite-border text-xs text-silver flex items-start gap-2">
                    <span className="text-status-warning font-mono font-bold">#0{idx + 1}</span>
                    <span>{f}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-muted">No adverse delay risks recorded.</p>
              )}
            </div>
          </div>

          {/* Observations & Return Reason */}
          <div className="platinum-card p-5 rounded-xl border border-graphite-border space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold flex items-center gap-2">
              <Info size={14} className="text-platinum" />
              <span>Recorded Scrutiny Observations</span>
            </h3>
            {app.returnReason && (
              <div className="p-3 rounded bg-status-warning/10 border border-status-warning/30 text-status-warning text-xs">
                <p className="font-bold font-mono uppercase">Outstanding Deficiency Notice:</p>
                <p className="mt-1">{app.returnReason}</p>
              </div>
            )}
            <div className="p-3 bg-obsidian rounded border border-graphite-border text-xs font-mono text-slate-muted whitespace-pre-line">
              {app.observations || 'No formal observations filed yet.'}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Stage History */}
      {activeTab === 'history' && (
        <div className="platinum-card p-5 rounded-xl border border-graphite-border space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
            Chronological Stage Transition Record
          </h3>
          <div className="space-y-3">
            {(app.stageHistories || []).map((sh: any) => (
              <div key={sh.id} className="p-3 rounded-lg bg-obsidian border border-graphite-border flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-silver-bright">{sh.action}</span>
                    <span className="text-[10px] font-mono text-slate-muted">
                      ({sh.fromStage} → {sh.toStage})
                    </span>
                  </div>
                  <p className="text-xs text-slate-muted mt-1">{sh.comments || 'No remarks recorded.'}</p>
                  <span className="text-[10px] font-mono text-platinum mt-1 block">
                    Executed by {sh.actorRole}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-muted">
                    {new Date(sh.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </span>
                  {sh.durationHours !== null && (
                    <span className="block text-[10px] font-mono text-platinum mt-0.5">
                      Stage Time: {sh.durationHours.toFixed(1)}h
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: EVC Inspection */}
      {activeTab === 'evc' && (
        <div className="platinum-card p-5 rounded-xl border border-graphite-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
              Expert Visit Committee (EVC) Schedule & Findings
            </h3>
            <Link to="/evc" className="text-xs text-platinum hover:underline">
              Open EVC Management Desk →
            </Link>
          </div>

          {(app.evcVisits || []).length === 0 ? (
            <p className="text-xs text-slate-muted">No EVC visit registered for this case.</p>
          ) : (
            app.evcVisits.map((evc: any) => (
              <div key={evc.id} className="p-4 rounded-lg bg-obsidian border border-graphite-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-silver-bright">{evc.visitType} Visit</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gunmetal border border-graphite-border text-platinum">
                    {evc.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-muted pt-2">
                  <div>
                    <span>Scheduled Date: </span>
                    <span className="text-silver">
                      {evc.scheduledDate ? new Date(evc.scheduledDate).toISOString().split('T')[0] : 'Unscheduled'}
                    </span>
                  </div>
                  <div>
                    <span>Prerequisites Certified: </span>
                    <span className={evc.prerequisitesSatisfied ? 'text-status-success' : 'text-status-critical'}>
                      {evc.prerequisitesSatisfied ? 'SATISFIED' : 'PENDING DEFICIENCY CLEARANCE'}
                    </span>
                  </div>
                </div>
                {evc.findings && (
                  <div className="mt-2 p-2.5 bg-graphite rounded text-xs text-silver">
                    <p className="font-mono font-bold text-[10px] text-platinum uppercase">Inspection Findings:</p>
                    <p className="mt-1">{evc.findings}</p>
                    {evc.reportHash && (
                      <span className="block text-[9px] font-mono text-slate-muted mt-2 truncate">
                        SHA-256 Report Hash: {evc.reportHash}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Compliance Obligations */}
      {activeTab === 'compliance' && (
        <div className="platinum-card p-5 rounded-xl border border-graphite-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
              Statutory Undertakings & Compliance Obligations
            </h3>
            <Link to="/compliance" className="text-xs text-platinum hover:underline">
              Compliance Vault →
            </Link>
          </div>

          {(app.complianceObligations || []).map((ob: any) => {
            const statusInfo = formatPlainComplianceStatus(ob.status, ob.dueDate);
            const timing = formatDaysRemaining(ob.dueDate);

            return (
              <div key={ob.id} className="p-4 rounded-lg bg-obsidian border border-graphite-border space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-silver-bright">{ob.title}</h4>
                    <p className="text-[11px] text-slate-muted">{ob.description}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border whitespace-nowrap ${statusInfo.badgeStyle}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                <div className="p-2 rounded bg-gunmetal/30 border border-graphite-border/70 text-[11px] font-mono text-platinum">
                  {statusInfo.nextAction}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-graphite-border text-xs">
                  <span className="text-[10px] font-mono text-slate-muted">
                    Due Date: {timing.text} ({new Date(ob.dueDate).toISOString().split('T')[0]})
                  </span>

                {/* Evidence Submission Button */}
                {ob.status !== 'VERIFIED' && (
                  <button
                    onClick={() => {
                      setSelectedObligationId(ob.id);
                      setUploadFileName(`${ob.prescribedDocType}_Proof_2025.pdf`);
                      setEvidenceModalOpen(true);
                    }}
                    className="platinum-button-primary px-3 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5"
                  >
                    <Upload size={12} />
                    <span>Submit Evidence</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Tab 5: Documents Vault */}
      {activeTab === 'documents' && (
        <div className="platinum-card p-5 rounded-xl border border-graphite-border space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
            Prescribed Document Records & Expiry Validation
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-graphite-border text-slate-muted font-mono uppercase text-[10px]">
                  <th className="py-2 px-3">Document Title</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Expiry Date</th>
                  <th className="py-2 px-3">Verification</th>
                  <th className="py-2 px-3 font-mono">SHA-256 Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-border">
                {(app.documentRecords || []).map((doc: any) => (
                  <tr key={doc.id}>
                    <td className="py-2.5 px-3 font-medium text-silver-bright">{doc.title}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-muted text-[11px]">{doc.category}</td>
                    <td className="py-2.5 px-3 font-mono">
                      {doc.expiryDate ? (
                        <span className={new Date(doc.expiryDate) < new Date() ? 'text-status-critical font-bold' : 'text-slate-muted'}>
                          {new Date(doc.expiryDate).toISOString().split('T')[0]}
                        </span>
                      ) : (
                        'Permanent'
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-gunmetal border border-graphite-border">
                        {doc.verificationStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[9px] text-slate-muted truncate max-w-xs">
                      {doc.fileHash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Advance Workflow Transition Modal */}
      {transitionModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="platinum-card max-w-md w-full p-6 rounded-2xl border border-graphite-border space-y-4">
            <h3 className="text-sm font-bold text-silver-bright">Advance Workflow Stage</h3>
            <p className="text-xs text-slate-muted">Select the next compliant processing stage permitted by APH rules</p>

            <div>
              <label className="block text-xs font-medium text-platinum mb-1 font-mono">Target Stage</label>
              <select
                value={targetStage}
                onChange={(e) => setTargetStage(e.target.value)}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver"
              >
                {nextOptions.map((opt) => (
                  <option key={opt.stage} value={opt.stage}>
                    {opt.label} ({opt.stage})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-platinum mb-1 font-mono">Officer Remarks</label>
              <textarea
                value={transitionComments}
                onChange={(e) => setTransitionComments(e.target.value)}
                rows={3}
                placeholder="Record compliance clearance remarks..."
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTransitionModalOpen(false)}
                className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  transitionMutation.mutate({
                    targetStage,
                    action: nextOptions.find((o) => o.stage === targetStage)?.action || 'TRANSITION',
                    comments: transitionComments,
                  })
                }
                disabled={transitionMutation.isPending}
                className="platinum-button-primary px-4 py-1.5 rounded-lg text-xs font-semibold"
              >
                {transitionMutation.isPending ? 'Validating...' : 'Confirm Transition'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Case Modal */}
      {returnModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="platinum-card max-w-md w-full p-6 rounded-2xl border border-graphite-border space-y-4">
            <h3 className="text-sm font-bold text-status-warning flex items-center gap-2">
              <RotateCcw size={16} />
              <span>Return Case for Clarification / Deficiency</span>
            </h3>
            <p className="text-xs text-slate-muted">
              Record specific statutory deficiencies. The application will be routed to the institution with a cure window.
            </p>

            <div>
              <label className="block text-xs font-medium text-platinum mb-1 font-mono">
                Mandatory Return Reason & Deficiency Citations *
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={4}
                placeholder="e.g. Registered land lease deed missing Sub-Registrar non-encumbrance certificate..."
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none focus:border-status-warning"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReturnModalOpen(false)}
                className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => returnMutation.mutate({ reason: returnReason })}
                disabled={returnReason.length < 5 || returnMutation.isPending}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-status-warning text-obsidian hover:bg-amber-400 disabled:opacity-50"
              >
                {returnMutation.isPending ? 'Logging Deficiencies...' : 'Dispatch Return Notice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Evidence Modal */}
      {evidenceModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="platinum-card max-w-md w-full p-6 rounded-2xl border border-graphite-border space-y-4">
            <h3 className="text-sm font-bold text-silver-bright flex items-center gap-2">
              <Upload size={16} className="text-platinum" />
              <span>Submit Compliance Evidence</span>
            </h3>
            <p className="text-xs text-slate-muted">
              Evidence files are hashed using SHA-256 to ensure verifiable cryptographic integrity in the audit log.
            </p>

            <div>
              <label className="block text-xs font-medium text-platinum mb-1 font-mono">File Name</label>
              <input
                type="text"
                value={uploadFileName}
                onChange={(e) => setUploadFileName(e.target.value)}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
              />
            </div>

            <div className="p-3 bg-obsidian rounded border border-graphite-border text-[11px] font-mono text-slate-muted space-y-1">
              <p>Size: {(uploadFileSize / 1024).toFixed(1)} KB</p>
              <p className="text-platinum">Crypto Engine: SHA-256 Vault Hash Generated on Transmit</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEvidenceModalOpen(false)}
                className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  submitEvidenceMutation.mutate({
                    obligationId: selectedObligationId!,
                    body: {
                      fileName: uploadFileName,
                      fileSize: uploadFileSize,
                    },
                  })
                }
                disabled={submitEvidenceMutation.isPending || !uploadFileName}
                className="platinum-button-primary px-4 py-1.5 rounded-lg text-xs font-semibold"
              >
                {submitEvidenceMutation.isPending ? 'Transmitting...' : 'Upload & Compute Hash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ApplicationDetailPage;
