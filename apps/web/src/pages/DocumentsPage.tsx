import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Upload,
  Plus,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { formatCategory, formatStatus } from '../lib/plainLanguage.js';

export function DocumentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [expiryFilter, setExpiryFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  // Upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('LEASE_AGREEMENT');
  const [docExpiryDate, setDocExpiryDate] = useState('');
  const [docFileName, setDocFileName] = useState('');

  const queryParams = new URLSearchParams({
    ...(expiryFilter ? { expiryFilter } : {}),
    ...(categoryFilter ? { category: categoryFilter } : {}),
    ...(search ? { search } : {}),
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents-vault', queryParams.toString()],
    queryFn: () => apiRequest<any[]>(`/documents?${queryParams.toString()}`),
  });

  const uploadDocMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest('/documents', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents-vault'] });
      setUploadModalOpen(false);
      setDocTitle('');
      setDocFileName('');
    },
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.institutionId && user?.role === 'INSTITUTION_USER') return;

    uploadDocMutation.mutate({
      institutionId: user?.institutionId || documents?.[0]?.institutionId,
      title: docTitle,
      category: docCategory,
      fileName: docFileName || `${docTitle.replace(/\s+/g, '-')}.pdf`,
      fileSize: 3145728,
      expiryDate: docExpiryDate ? new Date(docExpiryDate).toISOString() : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-silver-bright tracking-tight">Prescribed documents</h1>
          <p className="text-xs text-slate-muted">Cryptographically verified land records, building safety certificates, and statutory lease deeds</p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="platinum-button-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start cursor-pointer"
        >
          <Plus size={14} />
          <span>Upload document</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="platinum-card p-4 rounded-xl border border-graphite-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            aria-label="Filter by expiry status"
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none cursor-pointer"
          >
            <option value="">All expiry statuses</option>
            <option value="EXPIRING_30_DAYS">Expiring in &lt; 30 days</option>
            <option value="EXPIRED">Expired records</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by document type"
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none cursor-pointer"
          >
            <option value="">All document types</option>
            <option value="LEASE_AGREEMENT">Land lease agreement</option>
            <option value="BUILDING_STABILITY">Building stability</option>
            <option value="FIRE_SAFETY_CERTIFICATE">Fire safety certificate</option>
            <option value="NOC_STATE_GOVT">State government clearance</option>
          </select>
        </div>

        <span className="text-xs text-slate-muted">
          Tracking {documents?.length || 0} registered records
        </span>
      </div>

      {/* Document Records Table */}
      <div className="platinum-card rounded-xl border border-graphite-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-muted font-mono text-xs">Loading vault records...</div>
        ) : (documents || []).length === 0 ? (
          <div className="p-12 text-center text-slate-muted">
            <FileText size={32} className="mx-auto mb-2 text-gunmetal-light" />
            <p className="text-sm font-medium text-silver">No documents found. Try changing your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-graphite-border bg-graphite/40 text-slate-muted font-medium text-[11px]">
                  <th className="py-3 px-4">Document title</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Expiry date</th>
                  <th className="py-3 px-4">Verification status</th>
                  <th className="py-3 px-4 font-mono">File hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-border">
                {documents!.map((doc: any) => {
                  const now = new Date();
                  const isExpired = doc.expiryDate && new Date(doc.expiryDate) < now;
                  const isExpiringSoon =
                    doc.expiryDate &&
                    new Date(doc.expiryDate) >= now &&
                    new Date(doc.expiryDate) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                  return (
                    <tr key={doc.id} className="hover:bg-graphite-hover transition-colors">
                      <td className="py-3 px-4 font-medium text-silver-bright">
                        {doc.title}
                        <span className="block text-[10px] text-slate-muted">
                          {doc.fileName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-silver">{doc.institution.name}</span>
                        <span className="block text-[10px] text-slate-muted">
                          {doc.institution.region} region
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-muted text-[11px]">{formatCategory(doc.category)}</td>
                      <td className="py-3 px-4 text-[11px]">
                        {doc.expiryDate ? (
                          <span
                            className={
                              isExpired
                                ? 'text-status-critical font-medium'
                                : isExpiringSoon
                                ? 'text-status-warning font-medium'
                                : 'text-slate-muted'
                            }
                          >
                            {new Date(doc.expiryDate).toISOString().split('T')[0]}
                            {isExpired && ' (Expired)'}
                            {isExpiringSoon && ' (Due soon)'}
                          </span>
                        ) : (
                          <span className="text-status-success font-medium">Permanent</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gunmetal border border-graphite-border">
                          {formatStatus(doc.verificationStatus)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-muted max-w-[140px] truncate">
                        {doc.fileHash}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="platinum-card max-w-md w-full p-6 rounded-2xl border border-graphite-border space-y-4">
            <h3 className="text-sm font-bold text-silver-bright flex items-center gap-2">
              <Upload size={16} className="text-platinum" />
              <span>Upload document</span>
            </h3>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-platinum mb-1">Document title *</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Registered land lease deed plot 4"
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-platinum mb-1">Document category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                >
                  <option value="LEASE_AGREEMENT">Land lease agreement</option>
                  <option value="FIRE_SAFETY_CERTIFICATE">Fire safety certificate</option>
                  <option value="BUILDING_STABILITY">Building stability certificate</option>
                  <option value="NOC_STATE_GOVT">State government clearance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-platinum mb-1">Expiry date (leave empty if permanent)</label>
                <input
                  type="date"
                  value={docExpiryDate}
                  onChange={(e) => setDocExpiryDate(e.target.value)}
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadDocMutation.isPending || !docTitle}
                  className="platinum-button-primary px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {uploadDocMutation.isPending ? 'Saving...' : 'Save document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentsPage;
