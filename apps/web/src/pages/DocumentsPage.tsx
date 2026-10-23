import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Clock,
  AlertTriangle,
  Upload,
  Plus,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';

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
      fileName: docFileName || `${docTitle.replace(/\s+/g, '_')}.pdf`,
      fileSize: 3145728,
      expiryDate: docExpiryDate ? new Date(docExpiryDate).toISOString() : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-silver-bright tracking-tight">Prescribed Document Records Vault</h2>
          <p className="text-xs text-slate-muted">Cryptographically verified land records, building safety certs, and statutory lease deeds</p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="platinum-button-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start"
        >
          <Plus size={14} />
          <span>Register New Document</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="platinum-card p-4 rounded-xl border border-graphite-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none"
          >
            <option value="">All Expiry Statuses</option>
            <option value="EXPIRING_30_DAYS">Expiring in &lt; 30 Days</option>
            <option value="EXPIRED">Expired Records</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none"
          >
            <option value="">All Document Types</option>
            <option value="LEASE_AGREEMENT">Land Lease Agreement</option>
            <option value="BUILDING_STABILITY">Building Stability</option>
            <option value="FIRE_SAFETY_CERTIFICATE">Fire Safety Certificate</option>
            <option value="NOC_STATE_GOVT">State Govt NOC</option>
          </select>
        </div>

        <span className="text-xs font-mono text-slate-muted">
          Tracking {documents?.length || 0} Registered Records
        </span>
      </div>

      {/* Document Records Table */}
      <div className="platinum-card rounded-xl border border-graphite-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-muted font-mono text-xs">Loading vault records...</div>
        ) : (documents || []).length === 0 ? (
          <div className="p-12 text-center text-slate-muted">
            <FileText size={32} className="mx-auto mb-2 text-gunmetal-light" />
            <p className="text-sm font-medium text-silver">No documents match the specified filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-graphite-border bg-graphite/40 text-slate-muted font-mono uppercase text-[10px]">
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 font-mono">SHA-256 Vault Hash</th>
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
                      <td className="py-3 px-4 font-bold text-silver-bright">
                        {doc.title}
                        <span className="block text-[10px] font-mono font-normal text-slate-muted">
                          {doc.fileName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-silver">{doc.institution.name}</span>
                        <span className="block text-[10px] font-mono text-slate-muted">
                          {doc.institution.region} Region
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-muted text-[11px]">{doc.category}</td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {doc.expiryDate ? (
                          <span
                            className={
                              isExpired
                                ? 'text-status-critical font-bold'
                                : isExpiringSoon
                                ? 'text-status-warning font-bold'
                                : 'text-slate-muted'
                            }
                          >
                            {new Date(doc.expiryDate).toISOString().split('T')[0]}
                            {isExpired && ' (EXPIRED)'}
                            {isExpiringSoon && ' (IMMINENT)'}
                          </span>
                        ) : (
                          <span className="text-status-success font-bold">PERPETUAL</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-gunmetal border border-graphite-border">
                          {doc.verificationStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[9px] text-slate-muted max-w-[140px] truncate">
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
              <span>Register Prescribed Document Record</span>
            </h3>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-platinum mb-1 font-mono">Document Title *</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Registered Land Lease Deed Plot 4"
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-platinum mb-1 font-mono">Document Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                >
                  <option value="LEASE_AGREEMENT">Land Lease Agreement</option>
                  <option value="FIRE_SAFETY_CERTIFICATE">Fire Safety Certificate</option>
                  <option value="BUILDING_STABILITY">Building Stability & Structural Audit</option>
                  <option value="NOC_STATE_GOVT">State Government NOC</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-platinum mb-1 font-mono">Expiry Date (Leave empty if perpetual)</label>
                <input
                  type="date"
                  value={docExpiryDate}
                  onChange={(e) => setDocExpiryDate(e.target.value)}
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-platinum mb-1 font-mono">File Name</label>
                <input
                  type="text"
                  value={docFileName}
                  onChange={(e) => setDocFileName(e.target.value)}
                  placeholder="e.g. Registered_Lease_2025.pdf"
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadDocMutation.isPending || !docTitle}
                  className="platinum-button-primary px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {uploadDocMutation.isPending ? 'Registering...' : 'Register & Compute Hash'}
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
