import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Radar,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { formatPlainStage, formatSeverity } from '../lib/plainLanguage.js';

export function RiskRadarPage() {
  const [selectedRiskCategory, setSelectedRiskCategory] = useState<string>('');
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  const { data: riskCases, isLoading } = useQuery({
    queryKey: ['risk-radar-cases'],
    queryFn: () => apiRequest<any[]>('/dashboard/risks'),
  });

  const filteredCases = (riskCases || []).filter((c) =>
    selectedRiskCategory ? c.riskCategory === selectedRiskCategory : true
  );

  const toggleExpand = (id: string) => {
    setExpandedAppId(expandedAppId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="platinum-card p-6 rounded-2xl border border-graphite-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gunmetal border border-graphite-border text-xs text-platinum mb-2">
              <Radar size={14} className="text-status-warning" />
              <span>Operational risk monitoring</span>
            </div>
            <h1 className="text-2xl font-bold text-silver-bright tracking-tight">Risk monitoring</h1>
            <p className="text-xs text-slate-muted max-w-2xl mt-1 leading-relaxed">
              Explainable operational scoring calculating potential bottleneck severity based on statutory deadline proximity,
              review latency, missing prerequisites, and document expiry horizons.
            </p>
          </div>
        </div>

        {/* Explainability Notice */}
        <div className="mt-4 p-2.5 rounded-lg bg-obsidian border border-graphite-border text-xs text-slate-muted flex items-center gap-2">
          <Info size={14} className="text-platinum flex-shrink-0" />
          <span>Notice: This score is a configurable administrative prioritisation metric — not an autonomous automated determination.</span>
        </div>
      </div>

      {/* Filter and Metric Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All risks', value: '' },
            { label: 'Critical', value: 'CRITICAL' },
            { label: 'High', value: 'HIGH' },
            { label: 'Medium', value: 'MEDIUM' },
            { label: 'Low', value: 'LOW' },
          ].map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedRiskCategory(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
                selectedRiskCategory === cat.value
                  ? 'bg-platinum text-obsidian border-white font-semibold'
                  : 'bg-graphite text-slate-muted border-graphite-border hover:text-silver'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-muted">
          Showing {filteredCases.length} prioritized applications
        </span>
      </div>

      {/* Risk Cases List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-slate-muted font-mono text-xs">Computing risk radar scores...</div>
        ) : filteredCases.length === 0 ? (
          <div className="platinum-card p-12 text-center text-slate-muted rounded-xl border border-graphite-border">
            <p className="text-sm font-medium text-silver">No applications currently fall under this risk bracket</p>
          </div>
        ) : (
          filteredCases.map((app) => {
            const isExpanded = expandedAppId === app.id;

            return (
              <div
                key={app.id}
                className="platinum-card rounded-xl border border-graphite-border overflow-hidden transition-colors"
              >
                <div
                  onClick={() => toggleExpand(app.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-graphite-hover"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-sm text-silver-bright">{app.applicationNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          app.riskCategory === 'CRITICAL'
                            ? 'bg-status-critical/15 text-status-critical border-status-critical/30'
                            : app.riskCategory === 'HIGH'
                            ? 'bg-status-warning/15 text-status-warning border-status-warning/30'
                            : 'bg-gunmetal text-silver border-graphite-border'
                        }`}
                      >
                        Risk score: {app.riskScore} / 100 • {formatSeverity(app.riskCategory)}
                      </span>
                      <span className="text-[10px] text-slate-muted">
                        Stage: {formatPlainStage(app.currentStage)}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-silver">
                      {app.institutionName} ({app.institutionCode}) • {app.region} region
                    </p>
                  </div>

                  <div className="flex items-center gap-4 self-start md:self-center">
                    <div className="text-right text-xs">
                      <span className="text-[10px] text-slate-muted block">Deadline:</span>
                      <span className="font-semibold text-silver">
                        {app.deadlineDate ? new Date(app.deadlineDate).toISOString().split('T')[0] : 'Open schedule'}
                      </span>
                    </div>

                    <button className="p-1 text-slate-muted hover:text-silver" aria-label="Toggle details">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Explainability Breakdown */}
                {isExpanded && (
                  <div className="p-4 bg-obsidian border-t border-graphite-border space-y-3">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-platinum flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-status-warning" />
                      <span>Contributing risk factors</span>
                    </h4>

                    <div className="space-y-1.5">
                      {app.riskFactors?.map((factor: string, idx: number) => (
                        <div key={idx} className="p-2 rounded bg-graphite border border-graphite-border text-xs text-silver flex items-start gap-2">
                          <span className="text-status-warning font-mono font-medium">#{idx + 1}</span>
                          <span>{factor}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Link
                        to={`/applications/${app.id}`}
                        className="platinum-button-primary px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>View application</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default RiskRadarPage;
