import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Info,
  Layers,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';

export function RuleCompilerPage() {
  const queryClient = useQueryClient();

  const [inputText, setInputText] = useState(
    'The Institution shall possess registered land lease deed for a minimum period of 30 years. In the absence of an encumbrance clearance certificate, the regional scrutiny committee shall hold EVC scheduling for 14 working days.'
  );
  const [sectionRef, setSectionRef] = useState('Chapter II, Section 4.1');

  const { data: ruleDrafts, isLoading } = useQuery({
    queryKey: ['rule-drafts'],
    queryFn: () => apiRequest<any[]>('/rules/drafts'),
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

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, comments }: { id: string; status: string; comments: string }) =>
      apiRequest(`/rules/drafts/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ status, comments }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rule-drafts'] });
    },
  });

  const handleExtractSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText) return;
    extractMutation.mutate({
      sectionText: inputText,
      sectionRef,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="platinum-card p-6 rounded-2xl border border-graphite-border bg-obsidian-gradient">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gunmetal border border-graphite-border text-xs font-mono text-platinum mb-2">
              <BookOpen size={14} className="text-status-warning" />
              <span>APH RULE COMPILER // REGULATORY DSL EXTRACTOR</span>
            </div>
            <h2 className="text-2xl font-bold text-silver-bright tracking-tight">AICTE Handbook Rule Compiler</h2>
            <p className="text-xs text-slate-muted max-w-2xl mt-1">
              Extract, formalize, and validate structured workflow rules directly from official AICTE Approval Process Handbook (APH) text.
              Draft rules remain strictly inactive until authorized administrative validation.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Text Extractor */}
        <div className="lg:col-span-5 platinum-card p-5 rounded-2xl border border-graphite-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-graphite-border">
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
              Extract from Regulatory Text
            </h3>
            <span className="text-[10px] font-mono text-slate-muted">Proof-of-Concept Engine</span>
          </div>

          <form onSubmit={handleExtractSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-platinum mb-1 font-mono">Handbook Section Reference</label>
              <input
                type="text"
                value={sectionRef}
                onChange={(e) => setSectionRef(e.target.value)}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-platinum mb-1 font-mono">APH Regulatory Handbook Clause Text *</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={6}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2.5 text-xs text-silver focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={extractMutation.isPending || !inputText}
              className="w-full platinum-button-primary py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-platinum"
            >
              <Sparkles size={14} />
              <span>{extractMutation.isPending ? 'Parsing Handbook Entities...' : 'Compile Candidate Rule'}</span>
            </button>
          </form>
        </div>

        {/* Right: Side-by-side Draft Rules Review */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
            Draft Rule Catalog ({ruleDrafts?.length || 0})
          </h3>

          {isLoading ? (
            <div className="p-8 text-center text-slate-muted font-mono text-xs">Loading compiled drafts...</div>
          ) : (ruleDrafts || []).length === 0 ? (
            <div className="platinum-card p-12 text-center text-slate-muted rounded-xl border border-graphite-border">
              <p className="text-sm font-medium text-silver">No rule drafts in review queue</p>
            </div>
          ) : (
            ruleDrafts!.map((rule: any) => (
              <div key={rule.id} className="platinum-card p-5 rounded-xl border border-graphite-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-silver-bright">{rule.ruleId}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        rule.status === 'APPROVED'
                          ? 'bg-status-success/15 text-status-success border-status-success/30'
                          : rule.status === 'REJECTED'
                          ? 'bg-status-critical/15 text-status-critical border-status-critical/30'
                          : 'bg-status-warning/15 text-status-warning border-status-warning/30'
                      }`}
                    >
                      {rule.status}
                    </span>
                    <span className="text-[10px] font-mono text-platinum">
                      Confidence: {Math.round(rule.confidenceScore * 100)}%
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-muted">{rule.sectionRef}</span>
                </div>

                <h4 className="text-sm font-bold text-silver">{rule.title}</h4>

                {/* Side-by-side Source Text & Structured JSON */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="p-3 bg-obsidian rounded-lg border border-graphite-border space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-muted font-bold block">Source Text:</span>
                    <p className="text-silver/80 italic text-[11px]">{rule.extractedText}</p>
                  </div>

                  <div className="p-3 bg-obsidian rounded-lg border border-graphite-border space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-muted font-bold block">Structured Action:</span>
                    <pre className="text-[10px] font-mono text-platinum overflow-x-auto">
                      {JSON.stringify(rule.action, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Reviewer Actions */}
                {rule.status === 'DRAFT' && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-graphite-border">
                    <button
                      onClick={() =>
                        reviewMutation.mutate({
                          id: rule.id,
                          status: 'REJECTED',
                          comments: 'Rejected during procedural review.',
                        })
                      }
                      className="platinum-button-secondary px-3 py-1 rounded text-xs text-status-critical border-status-critical/30"
                    >
                      Reject Draft
                    </button>
                    <button
                      onClick={() =>
                        reviewMutation.mutate({
                          id: rule.id,
                          status: 'APPROVED',
                          comments: 'Approved by Bureau Head for workflow integration.',
                        })
                      }
                      className="platinum-button-primary px-3 py-1 rounded text-xs font-semibold"
                    >
                      Approve & Incorporate
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
export default RuleCompilerPage;
