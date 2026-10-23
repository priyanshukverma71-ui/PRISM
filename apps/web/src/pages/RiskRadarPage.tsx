import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Radar,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';

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
      <div className="platinum-card p-6 rounded-2xl border border-graphite-border bg-obsidian-gradient">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gunmetal border border-graphite-border text-xs font-mono text-platinum mb-2">
              <Radar size={14} className="text-status-warning" />
              <span>DETERMINISTIC RULES ENGINE // OPERATIONAL PRIORITISATION</span>
            </div>
            <h2 className="text-2xl font-bold text-silver-bright tracking-tight">Deadline Risk Radar</h2>
            <p className="text-xs text-slate-muted max-w-2xl mt-1">
              Deterministic, explainable operational scoring calculating potential bottleneck severity based on statutory SLA proximity,
              stage ageing latency, missing prerequisites, and document expiry horizons.
            </p>
          </div>
        </div>

        {/* Explainability Methodology Disclaimer */}
        <div className="mt-4 p-2.5 rounded-lg bg-obsidian border border-graphite-border text-[11px] font-mono text-slate-muted flex items-center gap-2">
          <Info size={14} className="text-platinum" />
          <span>Notice: This score is a configurable administrative prioritisation metric — not an autonomous AI/ML black-box decision.</span>
        </div>
      </div>

      {/* Filter and Metric Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedRiskCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors border ${
                selectedRiskCategory === cat
                  ? 'bg-platinum text-obsidian border-white'
                  : 'bg-graphite text-slate-muted border-graphite-border hover:text-silver'
              }`}
            >
              {cat || 'ALL RISKS'}
            </button>
          ))}
        </div>

        <span className="text-xs font-mono text-slate-muted">
          Showing {filteredCases.length} Prioritized Applications
        </span>
      </div>

      {/* Risk Cases List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-slate-muted font-mono text-xs">Computing deterministic risk radar scores...</div>
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
                className="platinum-card rounded-xl border border-graphite-border overflow-hidden transition-all"
              >
                <div
                  onClick={() => toggleExpand(app.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-graphite-hover"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-silver-bright">{app.applicationNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          app.riskCategory === 'CRITICAL'
                            ? 'bg-status-critical/20 text-status-critical border-status-critical/40'
                            : app.riskCategory === 'HIGH'
                            ? 'bg-status-warning/20 text-status-warning border-status-warning/40'
                            : 'bg-gunmetal text-silver border-graphite-border'
                        }`}
                      >
                        SCORE: {app.riskScore} / 100 [{app.riskCategory}]
                      </span>
                      <span className="text-[10px] font-mono text-slate-muted">
                        Stage: {(app.currentStage || '').replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-silver">
                      {app.institutionName} ({app.institutionCode}) • {app.region} Region
                    </p>
                  </div>

                  <div className="flex items-center gap-4 self-start md:self-center">
                    <div className="text-right text-xs font-mono">
                      <span className="text-[10px] text-slate-muted block">Regulatory Deadline:</span>
                      <span className="font-bold text-silver">
                        {app.deadlineDate ? new Date(app.deadlineDate).toISOString().split('T')[0] : 'N/A'}
                      </span>
                    </div>

                    <button className="p-1 text-slate-muted hover:text-silver">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Explainability Breakdown */}
                {isExpanded && (
                  <div className="p-4 bg-obsidian border-t border-graphite-border space-y-3">
                    <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-platinum flex items-center gap-1.5">
                      <ShieldAlert size={13} className="text-status-warning" />
                      <span>Contributing Risk Factors (Deterministic Weights)</span>
                    </h4>

                    <div className="space-y-1.5">
                      {app.riskFactors?.map((factor: string, idx: number) => (
                        <div key={idx} className="p-2 rounded bg-graphite border border-graphite-border text-xs text-silver flex items-start gap-2">
                          <span className="font-mono text-status-warning font-bold">#{idx + 1}</span>
                          <span>{factor}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Link
                        to={`/applications/${app.id}`}
                        className="platinum-button-primary px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <span>Open Case Dossier</span>
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
