import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  Layers,
  Sparkles,
  Zap,
  ShieldAlert,
  Clock,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Eye,
  BarChart3,
  Globe,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { SpatialHolodeck, SpatialCaseNode } from '../components/3d/SpatialHolodeck.js';
import { ChronosScrubber } from '../components/3d/ChronosScrubber.js';
import { HoloDossierDrawer } from '../components/3d/HoloDossierDrawer.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function DashboardPage() {
  const [viewMode, setViewMode] = useState<'3D_HOLODECK' | 'EXECUTIVE_METRICS'>('3D_HOLODECK');
  const [selectedCase, setSelectedCase] = useState<SpatialCaseNode | null>(null);
  const [temporalOffset, setTemporalOffset] = useState<number>(0);
  const [activeIntervention, setActiveIntervention] = useState<'NONE' | 'FAST_TRACK_EVC' | 'SPECIAL_SCRUTINY_DRIVE' | 'PROVISIONAL_UNDERTAKING'>('NONE');

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiRequest<any>('/dashboard/summary'),
    refetchInterval: 15000,
  });

  const { data: applications, isLoading: isAppsLoading } = useQuery({
    queryKey: ['dashboard-apps'],
    queryFn: () => apiRequest<any[]>('/applications?limit=12'),
  });

  // Map backend application data to Spatial 3D Nodes
  const spatialNodes: SpatialCaseNode[] = (applications || []).map((app: any) => {
    const isVjti = app.applicationNumber.includes('WRO-0491');
    const isDiaem = app.applicationNumber.includes('NRO-1104');
    const deadlineDiff = app.deadlineDate
      ? Math.ceil((new Date(app.deadlineDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 12;

    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      institutionName: app.institution.name,
      region: app.region,
      stage: app.currentStage,
      riskScore: app.riskScore,
      riskCategory: app.riskCategory,
      deadlineDaysRemaining: deadlineDiff,
      hasExpiringLease: isVjti,
      leaseExpiresInDays: isVjti ? 8 : undefined,
      isEvcBlocked: isDiaem,
    };
  });

  if (isSummaryLoading || isAppsLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-3 font-mono text-xs text-platinum">
        <span className="w-3 h-3 rounded-full bg-platinum animate-ping" />
        <span>Initializing PRISM 3D Spatial Holodeck Telemetry...</span>
      </div>
    );
  }

  const stageChartData = Object.entries(summary?.stageBreakdown || {}).map(([stage, count]) => ({
    stage: stage.replace(/_/g, ' '),
    count,
  }));

  return (
    <div className="space-y-4">
      {/* Top Streamlined Command Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gunmetal border border-platinum/40 flex items-center justify-center shadow-platinum">
            <span className="font-mono font-black text-silver-bright text-lg">Δ</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-silver-bright tracking-tight">AICTE PRISM Holodeck</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-platinum/15 text-platinum border border-platinum/30">
                4D TEMPORAL ENGINE ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-muted">
              Spatial 3D Constellation & Predictive Time-Travel Regulatory Scrubber
            </p>
          </div>
        </div>

        {/* View Mode Toggle: 3D Holodeck vs Executive Metrics */}
        <div className="flex items-center gap-1.5 bg-graphite p-1 rounded-xl border border-graphite-border">
          <button
            onClick={() => setViewMode('3D_HOLODECK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === '3D_HOLODECK'
                ? 'bg-platinum text-obsidian border border-white font-bold shadow-platinum'
                : 'text-slate-muted hover:text-silver'
            }`}
          >
            <Globe size={13} />
            <span>3D Spatial Holodeck</span>
          </button>

          <button
            onClick={() => setViewMode('EXECUTIVE_METRICS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'EXECUTIVE_METRICS'
                ? 'bg-platinum text-obsidian border border-white font-bold shadow-platinum'
                : 'text-slate-muted hover:text-silver'
            }`}
          >
            <BarChart3 size={13} />
            <span>Executive Telemetry</span>
          </button>
        </div>
      </div>

      {/* Streamlined Quick KPI Strip (Clickable directly to underlying records) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
        <div className="platinum-card p-3 rounded-xl border border-graphite-border">
          <span className="text-[10px] font-mono text-slate-muted uppercase block">Total Caseload</span>
          <span className="text-xl font-bold font-mono text-silver-bright tabular-nums">{summary?.totalApplications || 0}</span>
        </div>
        <Link to="/applications?stage=UNDER_SCRUTINY" className="platinum-card platinum-card-hover p-3 rounded-xl border border-graphite-border block">
          <span className="text-[10px] font-mono text-slate-muted uppercase block">Under Scrutiny</span>
          <span className="text-xl font-bold font-mono text-silver-bright tabular-nums">{summary?.pendingScrutiny || 0}</span>
        </Link>
        <Link to="/applications?stage=CLARIFICATION_REQUIRED" className="platinum-card platinum-card-hover p-3 rounded-xl border border-graphite-border block">
          <span className="text-[10px] font-mono text-status-warning uppercase block">Deficiencies</span>
          <span className="text-xl font-bold font-mono text-status-warning tabular-nums">{summary?.clarificationRequired || 0}</span>
        </Link>
        <Link to="/evc?status=PENDING_SCHEDULE" className="platinum-card platinum-card-hover p-3 rounded-xl border border-graphite-border block">
          <span className="text-[10px] font-mono text-slate-muted uppercase block">EVC Pending</span>
          <span className="text-xl font-bold font-mono text-silver-bright tabular-nums">{summary?.evcPendingScheduling || 0}</span>
        </Link>
        <Link to="/documents?expiryFilter=EXPIRING_30_DAYS" className="platinum-card platinum-card-hover p-3 rounded-xl border border-graphite-border block">
          <span className="text-[10px] font-mono text-status-warning uppercase block">Expiring Docs</span>
          <span className="text-xl font-bold font-mono text-status-warning tabular-nums">{summary?.documentsExpiringSoon || 0}</span>
        </Link>
        <Link to="/risk-radar" className="platinum-card platinum-card-hover p-3 rounded-xl border border-status-critical/30 bg-status-critical/5 block">
          <span className="text-[10px] font-mono text-status-critical uppercase block font-bold">Critical Alert</span>
          <span className="text-xl font-bold font-mono text-status-critical tabular-nums">{summary?.riskDistribution?.CRITICAL || 0}</span>
        </Link>
      </div>

      {/* Main View: 3D Spatial Holodeck */}
      {viewMode === '3D_HOLODECK' ? (
        <div className="space-y-3">
          {/* 3D Holodeck Canvas Viewport */}
          <div className="h-[520px] w-full relative">
            <SpatialHolodeck
              cases={spatialNodes}
              onSelectCase={(c) => setSelectedCase(c)}
              selectedCaseId={selectedCase?.id}
              temporalOffsetDays={temporalOffset}
              activeIntervention={activeIntervention}
            />
          </div>

          {/* 4D Chronos Predictive Temporal Scrubber */}
          <ChronosScrubber
            temporalOffset={temporalOffset}
            onChangeOffset={(val) => setTemporalOffset(val)}
            activeIntervention={activeIntervention}
            onChangeIntervention={(intv) => setActiveIntervention(intv)}
          />
        </div>
      ) : (
        /* Executive Metrics Grid View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
          <div className="platinum-card p-5 rounded-2xl border border-graphite-border space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
              Caseload by Processing Stage
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageChartData}>
                  <XAxis dataKey="stage" stroke="#525863" fontSize={10} tickLine={false} />
                  <YAxis stroke="#525863" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111316', borderColor: '#2A2E35', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#C7CBD0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="platinum-card p-5 rounded-2xl border border-graphite-border space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
              Regional Workload Balance
            </h3>
            <div className="space-y-3">
              {(summary?.regionalDistribution || []).map((r: any) => (
                <div key={r.region} className="flex items-center justify-between text-xs">
                  <span>{r.region} Region</span>
                  <span className="font-mono font-bold text-silver-bright bg-gunmetal px-2.5 py-1 rounded">
                    {r.count} applications
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Slide-out Holo-Dossier Drawer */}
      <HoloDossierDrawer
        node={selectedCase}
        onClose={() => setSelectedCase(null)}
        temporalOffsetDays={temporalOffset}
        activeIntervention={activeIntervention}
      />
    </div>
  );
}
export default DashboardPage;
