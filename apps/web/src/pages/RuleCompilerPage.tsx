import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { formatStatus, safeFormatError } from '../lib/plainLanguage.js';
import { useToast } from '../context/ToastContext.js';
import { LoadingState } from '../components/common/LoadingState.js';
import { EmptyState } from '../components/common/EmptyState.js';

export function RuleCompilerPage() {
  const { showToast } = useToast();
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
      showToast({
        type: 'success',
        title: 'Draft rule compiled',
        message: 'Draft rule compiled successfully. Pending administrative approval.',
      });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: "We couldn't compile the draft rule",
        message: safeFormatError(err, 'Check that the input text contains a valid statutory clause.'),
      });
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
      showToast({
        type: 'success',
        title: 'Rule review submitted',
        message: 'Rule status and review observations have been recorded.',
      });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: "We couldn't record the rule review",
        message: safeFormatError(err, 'Try again in a few moments.'),
      });
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
      <div className="platinum-card p-6 rounded-2xl border border-graphite-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gunmetal border border-graphite-border text-xs text-platinum mb-2">
              <BookOpen size={14} className="text-status-warning" />
              <span>Regulatory rule compiler</span>
            </div>
            <h1 className="text-2xl font-bold text-silver-bright tracking-tight">Handbook rule compiler</h1>
            <p className="text-xs text-slate-muted max-w-2xl mt-1 leading-relaxed">
              Extract, formalize, and validate structured workflow rules directly from official handbook text.
              Draft rules remain inactive until authorized administrative validation.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Text Extractor */}
        <div className="lg:col-span-5 platinum-card p-5 rounded-2xl border border-graphite-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-graphite-border">
            <h2 className="text-xs uppercase tracking-wider text-platinum font-semibold">
              Extract from handbook text
            </h2>
          </div>

          <form onSubmit={handleExtractSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-platinum mb-1">Section reference</label>
              <input
                type="text"
                value={sectionRef}
                onChange={(e) => setSectionRef(e.target.value)}
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-platinum mb-1">Clause text *</label>
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
              className="w-full platinum-button-primary py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles size={14} />
              <span>{extractMutation.isPending ? 'Compiling rule...' : 'Compile candidate rule'}</span>
            </button>
          </form>
        </div>

        {/* Right: Side-by-side Draft Rules Review */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xs uppercase tracking-wider text-platinum font-semibold">
            Draft rules catalog ({ruleDrafts?.length || 0})
          </h2>

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
                    <span className="font-mono font-medium text-xs text-silver-bright">{rule.ruleId}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        rule.status === 'APPROVED'
                          ? 'bg-status-success/15 text-status-success border-status-success/30'
                          : rule.status === 'REJECTED'
                          ? 'bg-status-critical/15 text-status-critical border-status-critical/30'
                          : 'bg-status-warning/15 text-status-warning border-status-warning/30'
                      }`}
                    >
                      {formatStatus(rule.status)}
                    </span>
                    <span className="text-[10px] text-platinum">
                      Confidence: {Math.round(rule.confidenceScore * 100)}%
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-muted">{rule.sectionRef}</span>
                </div>

                <h3 className="text-sm font-semibold text-silver">{rule.title}</h3>

                {/* Side-by-side Source Text & Structured JSON */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="p-3 bg-obsidian rounded-lg border border-graphite-border space-y-1">
                    <span className="text-[10px] uppercase text-slate-muted font-medium block">Source text:</span>
                    <p className="text-silver/80 italic text-[11px]">{rule.extractedText}</p>
                  </div>

                  <div className="p-3 bg-obsidian rounded-lg border border-graphite-border space-y-1">
                    <span className="text-[10px] uppercase text-slate-muted font-medium block">Structured action:</span>
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
                      className="platinum-button-secondary px-3 py-1 rounded text-xs text-status-critical border-status-critical/30 cursor-pointer"
                    >
                      Reject draft
                    </button>
                    <button
                      onClick={() =>
                        reviewMutation.mutate({
                          id: rule.id,
                          status: 'APPROVED',
                          comments: 'Approved by Bureau Head for workflow integration.',
                        })
                      }
                      className="platinum-button-primary px-3 py-1 rounded text-xs font-semibold cursor-pointer"
                    >
                      Approve rule
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
