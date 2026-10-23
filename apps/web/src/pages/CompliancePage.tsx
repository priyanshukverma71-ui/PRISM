import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Upload,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  formatPlainComplianceStatus,
  formatDaysRemaining,
  formatCategory,
  formatSeverity,
  formatStatus,
} from '../lib/plainLanguage.js';

export function CompliancePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedObligation, setSelectedObligation] = useState<any>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(2097152);

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [verifyStatus, setVerifyStatus] = useState<'VERIFIED' | 'RETURNED_WITH_DEFICIENCY'>('VERIFIED');
  const [verifyComments, setVerifyComments] = useState('');

  const queryParams = new URLSearchParams({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(categoryFilter ? { category: categoryFilter } : {}),
  });

  const { data: obligations, isLoading } = useQuery({
    queryKey: ['compliance-obligations', queryParams.toString()],
    queryFn: () => apiRequest<any[]>(`/compliance?${queryParams.toString()}`),
  });

  const submitEvidenceMutation = useMutation({
    mutationFn: ({ obligationId, body }: any) =>
      apiRequest(`/compliance/${obligationId}/submit`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-obligations'] });
      setSubmitModalOpen(false);
      setFileName('');
    },
  });

  const verifyEvidenceMutation = useMutation({
    mutationFn: ({ obligationId, body }: any) =>
      apiRequest(`/compliance/${obligationId}/verify`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-obligations'] });
      setVerifyModalOpen(false);
      setVerifyComments('');
    },
  });

  const handleOpenSubmit = (ob: any) => {
    setSelectedObligation(ob);
    setFileName(`${ob.prescribedDocType || 'Document'}_Signed_2025.pdf`);
    setSubmitModalOpen(true);
  };

  const handleOpenVerify = (ob: any, sub: any) => {
    setSelectedObligation(ob);
    setSelectedSubmission(sub);
    setVerifyComments('Prescribed documentation verified in order against statutory checklist.');
    setVerifyModalOpen(true);
  };

  const isOfficerOrAdmin =
    user?.role === 'REGIONAL_OFFICER' || user?.role === 'BUREAU_OFFICER' || user?.role === 'SYSTEM_ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-silver-bright tracking-tight">Compliance requirements</h1>
          <p className="text-xs text-slate-muted">Prescribed regulatory covenants, land lease deeds, safety clearances, and document verification</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="platinum-card p-4 rounded-xl border border-graphite-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by compliance status"
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none cursor-pointer"
          >
            <option value="">All compliance statuses</option>
            <option value="PENDING">Pending submission</option>
            <option value="SUBMITTED">Waiting for review</option>
            <option value="VERIFIED">Verified & compliant</option>
            <option value="DEFICIENT">Clarification needed</option>
            <option value="EXPIRED">Overdue / expired</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none cursor-pointer"
          >
            <option value="">All categories</option>
            <option value="LAND_BUILDING">Land and building</option>
            <option value="SAFETY_NOC">Safety clearance</option>
            <option value="FACULTY_CADRE">Faculty cadre and salary</option>
            <option value="AFFILIATION">University affiliation</option>
          </select>
        </div>

        <span className="text-xs text-slate-muted">
          Tracking {obligations?.length || 0} regulatory requirements
        </span>
      </div>

      {/* Obligations Grid */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="p-8 text-center text-slate-muted font-mono text-xs">Loading compliance registers...</div>
        ) : (obligations || []).length === 0 ? (
          <div className="platinum-card p-12 text-center text-slate-muted rounded-xl border border-graphite-border">
            <ShieldCheck size={32} className="mx-auto mb-2 text-gunmetal-light" />
            <p className="text-sm font-medium text-silver">No requirements found. Try changing your filters.</p>
          </div>
        ) : (
          obligations!.map((ob: any) => {
            const latestSub = ob.submissions && ob.submissions.length > 0 ? ob.submissions[0] : null;
            const statusInfo = formatPlainComplianceStatus(ob.status, ob.dueDate);
            const timing = formatDaysRemaining(ob.dueDate);

            return (
              <div
                key={ob.id}
                className="platinum-card p-5 rounded-xl border border-graphite-border space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-silver-bright">{ob.title}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-medium border ${statusInfo.badgeStyle}`}
                      >
                        {statusInfo.label}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-gunmetal text-platinum">
                        Severity: {formatSeverity(ob.severity)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-muted">{ob.description}</p>
                    <p className="text-[11px] text-slate-muted">
                      Target: {ob.institution.name} ({ob.institution.code}) • Category: {formatCategory(ob.category)}
                    </p>
                  </div>

                  <div className="text-right self-start sm:self-auto bg-gunmetal/40 px-3 py-1.5 rounded-lg border border-graphite-border">
                    <span className="text-[10px] text-slate-muted block">
                      Deadline:
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        timing.isOverdue
                          ? 'text-status-critical'
                          : timing.isAtRisk
                          ? 'text-status-warning'
                          : 'text-platinum'
                      }`}
                    >
                      {timing.text} ({new Date(ob.dueDate).toLocaleDateString()})
                    </span>
                  </div>
                </div>

                {/* Plain-Language Next Action Guidance Banner */}
                <div className="p-2.5 rounded-lg bg-obsidian border border-graphite-border flex items-center justify-between text-xs">
                  <span className="text-platinum font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-platinum" />
                    <span>{statusInfo.nextAction}</span>
                  </span>
                  {latestSub && (
                    <span className="text-[10px] text-slate-muted hidden md:inline">
                      Evidence v{latestSub.version} ({latestSub.fileName}): {formatStatus(latestSub.status)}
                    </span>
                  )}
                </div>

                {/* Submissions & Actions Bar */}
                <div className="pt-3 border-t border-graphite-border flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-muted">
                    {latestSub ? (
                      <span>
                        Latest document: <span className="text-silver">{latestSub.fileName}</span> (v{latestSub.version}) • Status:{' '}
                        <span className="text-platinum font-medium">{formatStatus(latestSub.status)}</span>
                      </span>
                    ) : (
                      <span>No document submitted yet.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Submit Evidence Button (Institutions or Admins) */}
                    {ob.status !== 'VERIFIED' && (
                      <button
                        onClick={() => handleOpenSubmit(ob)}
                        className="platinum-button-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload size={13} />
                        <span>Upload document</span>
                      </button>
                    )}

                    {/* Verify Evidence Button (Officers) */}
                    {isOfficerOrAdmin && latestSub && latestSub.status === 'PENDING_VERIFICATION' && (
                      <button
                        onClick={() => handleOpenVerify(ob, latestSub)}
                        className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-status-success border-status-success/30 hover:border-status-success cursor-pointer"
                      >
                        <CheckCircle size={13} />
                        <span>Verify document</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Submit Evidence Modal */}
      {submitModalOpen && selectedObligation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="platinum-card max-w-md w-full p-6 rounded-2xl border border-graphite-border space-y-4">
            <h3 className="text-sm font-bold text-silver-bright flex items-center gap-2">
              <Upload size={16} className="text-platinum" />
              <span>Upload document</span>
            </h3>
            <p className="text-xs text-slate-muted">
              {selectedObligation.title} — {selectedObligation.institution.name}
            </p>

            <div>
              <label className="block text-xs font-medium text-platinum mb-1">Document file name *</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  submitEvidenceMutation.mutate({
                    obligationId: selectedObligation.id,
                    body: { fileName, fileSize },
                  })
                }
                disabled={submitEvidenceMutation.isPending || !fileName}
                className="platinum-button-primary px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {submitEvidenceMutation.isPending ? 'Uploading...' : 'Save document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Evidence Modal */}
      {verifyModalOpen && selectedObligation && selectedSubmission && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="platinum-card max-w-md w-full p-6 rounded-2xl border border-graphite-border space-y-4">
            <h3 className="text-sm font-bold text-silver-bright flex items-center gap-2">
              <ShieldCheck size={16} className="text-status-success" />
              <span>Verify document</span>
            </h3>
            <p className="text-xs text-slate-muted">
              File: <span className="font-mono text-silver">{selectedSubmission.fileName}</span>
            </p>

            <div>
              <label className="block text-xs font-medium text-platinum mb-1">Review determination</label>
              <select
                value={verifyStatus}
                onChange={(e: any) => setVerifyStatus(e.target.value)}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
              >
                <option value="VERIFIED">Verified — Requirement satisfied</option>
                <option value="RETURNED_WITH_DEFICIENCY">Clarification needed — Record deficiency</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-platinum mb-1">Verification remarks *</label>
              <textarea
                value={verifyComments}
                onChange={(e) => setVerifyComments(e.target.value)}
                rows={3}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifyModalOpen(false)}
                className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  verifyEvidenceMutation.mutate({
                    obligationId: selectedObligation.id,
                    body: {
                      submissionId: selectedSubmission.id,
                      status: verifyStatus,
                      comments: verifyComments,
                    },
                  })
                }
                disabled={verifyEvidenceMutation.isPending}
                className="platinum-button-primary px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                {verifyEvidenceMutation.isPending ? 'Saving...' : 'Confirm review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompliancePage;
