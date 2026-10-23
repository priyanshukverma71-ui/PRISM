import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Search,
  Filter,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';

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
    setFileName(`${ob.prescribedDocType}_Signed_2025.pdf`);
    setSubmitModalOpen(true);
  };

  const handleOpenVerify = (ob: any, sub: any) => {
    setSelectedObligation(ob);
    setSelectedSubmission(sub);
    setVerifyComments('Prescribed documentation verified in order against statutory APH checklist.');
    setVerifyModalOpen(true);
  };

  const isOfficerOrAdmin =
    user?.role === 'REGIONAL_OFFICER' || user?.role === 'BUREAU_OFFICER' || user?.role === 'SYSTEM_ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-silver-bright tracking-tight">Compliance & Undertakings Vault</h2>
          <p className="text-xs text-slate-muted">Prescribed regulatory covenants, land lease deeds, fire NOCs, and evidence verification</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="platinum-card p-4 rounded-xl border border-graphite-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none"
          >
            <option value="">All Compliance Statuses</option>
            <option value="PENDING">Pending Submission</option>
            <option value="SUBMITTED">Submitted (Awaiting Verification)</option>
            <option value="VERIFIED">Verified / Compliant</option>
            <option value="DEFICIENT">Deficient / Action Required</option>
            <option value="EXPIRED">Overdue / Expired</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="LAND_BUILDING">Land & Building</option>
            <option value="SAFETY_NOC">Safety & Disaster NOC</option>
            <option value="FACULTY_CADRE">Faculty Cadre & Salary</option>
            <option value="AFFILIATION">Affiliating University</option>
          </select>
        </div>

        <span className="text-xs font-mono text-slate-muted">
          Tracking {obligations?.length || 0} Regulatory Obligations
        </span>
      </div>

      {/* Obligations Grid */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="p-8 text-center text-slate-muted font-mono text-xs">Loading compliance registers...</div>
        ) : (obligations || []).length === 0 ? (
          <div className="platinum-card p-12 text-center text-slate-muted rounded-xl border border-graphite-border">
            <ShieldCheck size={32} className="mx-auto mb-2 text-gunmetal-light" />
            <p className="text-sm font-medium text-silver">No obligations match current filter</p>
          </div>
        ) : (
          obligations!.map((ob: any) => {
            const latestSub = ob.submissions && ob.submissions.length > 0 ? ob.submissions[0] : null;

            return (
              <div
                key={ob.id}
                className="platinum-card p-5 rounded-xl border border-graphite-border space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-silver-bright">{ob.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          ob.status === 'VERIFIED'
                            ? 'bg-status-success/15 text-status-success border-status-success/30'
                            : ob.status === 'DEFICIENT' || ob.status === 'EXPIRED'
                            ? 'bg-status-critical/15 text-status-critical border-status-critical/30'
                            : ob.status === 'SUBMITTED'
                            ? 'bg-blue-950/50 text-blue-300 border-blue-800'
                            : 'bg-status-warning/15 text-status-warning border-status-warning/30'
                        }`}
                      >
                        {ob.status}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gunmetal text-platinum">
                        Severity: {ob.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-muted mt-1">{ob.description}</p>
                    <p className="text-[11px] font-mono text-slate-muted mt-1">
                      Target: {ob.institution.name} ({ob.institution.code}) • {ob.category}
                    </p>
                  </div>

                  <div className="text-right self-start">
                    <span className="text-[11px] font-mono text-slate-muted block">
                      Statutory Due Date:
                    </span>
                    <span
                      className={`font-mono text-xs font-bold ${
                        new Date(ob.dueDate) < new Date() ? 'text-status-critical' : 'text-platinum'
                      }`}
                    >
                      {new Date(ob.dueDate).toISOString().split('T')[0]}
                    </span>
                  </div>
                </div>

                {/* Submissions & Actions Bar */}
                <div className="pt-3 border-t border-graphite-border flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-mono text-slate-muted">
                    {latestSub ? (
                      <span>
                        Latest Evidence: <span className="text-silver">{latestSub.fileName}</span> (v{latestSub.version}) • Status:{' '}
                        <span className="text-platinum">{latestSub.status}</span>
                      </span>
                    ) : (
                      <span>No evidence submitted yet.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Submit Evidence Button (Institutions or Admins) */}
                    {ob.status !== 'VERIFIED' && (
                      <button
                        onClick={() => handleOpenSubmit(ob)}
                        className="platinum-button-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Upload size={13} />
                        <span>Submit Evidence</span>
                      </button>
                    )}

                    {/* Verify Evidence Button (Officers) */}
                    {isOfficerOrAdmin && latestSub && latestSub.status === 'PENDING_VERIFICATION' && (
                      <button
                        onClick={() => handleOpenVerify(ob, latestSub)}
                        className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-status-success border-status-success/30 hover:border-status-success"
                      >
                        <CheckCircle size={13} />
                        <span>Verify Evidence</span>
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
              <span>Submit Compliance Evidence</span>
            </h3>
            <p className="text-xs text-slate-muted">
              {selectedObligation.title} — {selectedObligation.institution.name}
            </p>

            <div>
              <label className="block text-xs font-medium text-platinum mb-1 font-mono">Evidence File Name *</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                required
              />
            </div>

            <div className="p-3 bg-obsidian rounded border border-graphite-border text-[11px] font-mono text-slate-muted space-y-1">
              <p>Simulated File Size: {(fileSize / 1024 / 1024).toFixed(2)} MB</p>
              <p className="text-platinum">Crypto Engine: Instant SHA-256 Checksum Calculation</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs"
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
                {submitEvidenceMutation.isPending ? 'Uploading & Hashing...' : 'Submit Evidence'}
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
              <span>Verify Institutional Evidence</span>
            </h3>
            <p className="text-xs text-slate-muted">
              File: <span className="font-mono text-silver">{selectedSubmission.fileName}</span> (Hash:{' '}
              {selectedSubmission.fileHash.substring(0, 12)}...)
            </p>

            <div>
              <label className="block text-xs font-medium text-platinum mb-1 font-mono">Regulatory Determination</label>
              <select
                value={verifyStatus}
                onChange={(e: any) => setVerifyStatus(e.target.value)}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
              >
                <option value="VERIFIED">VERIFIED — Requirement Satisfied</option>
                <option value="RETURNED_WITH_DEFICIENCY">DEFICIENT — Reject & Raise Formal Deficiency</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-platinum mb-1 font-mono">Verification Remarks *</label>
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
                className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs"
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
                {verifyEvidenceMutation.isPending ? 'Recording in Audit...' : 'Execute Determination'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default CompliancePage;
