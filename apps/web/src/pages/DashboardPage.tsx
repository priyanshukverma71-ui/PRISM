import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldAlert,
  Layers,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { PrismCore } from '../components/3d/PrismCore.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export function DashboardPage() {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiRequest<any>('/dashboard/summary'),
    refetchInterval: 15000,
  });

  const { data: riskCases } = useQuery({
    queryKey: ['dashboard-risks'],
    queryFn: () => apiRequest<any[]>('/dashboard/risks'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-graphite rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-24 bg-graphite rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-8 text-center text-status-critical border border-status-critical/30 rounded-xl bg-graphite">
        <AlertTriangle size={32} className="mx-auto mb-2" />
        <p className="font-mono text-sm">Failed to connect to PRISM Kernel API</p>
      </div>
    );
  }

  const stageChartData = Object.entries(summary.stageBreakdown || {}).map(([stage, count]) => ({
    stage: stage.replace(/_/g, ' '),
    count,
  }));

  const COLORS = ['#DEE1E5', '#C7CBD0', '#9EA4AC', '#47D7A0', '#F4B860', '#FF626B'];

  return (
    <div className="space-y-6">
      {/* Hero: 3D PRISM Kernel Telemetry & Executive Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 platinum-card rounded-2xl p-6 border border-graphite-border flex flex-col justify-between relative overflow-hidden">
          <div className="z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-status-success animate-ping" />
              <span className="text-[11px] font-mono tracking-widest text-platinum uppercase">
                AICTE Operational Intelligence Active
              </span>
            </div>
            <h2 className="text-2xl font-bold text-silver-bright tracking-tight">
              Regulatory Command Centre
            </h2>
            <p className="text-xs text-slate-muted max-w-xl mt-1">
              Live automated monitoring across regulatory workflows, EVC scheduling windows, and institutional compliance obligations.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 z-10 pt-4 border-t border-graphite-border">
            <div>
              <p className="text-[10px] font-mono text-slate-muted uppercase">Total Caseload</p>
              <p className="text-2xl font-extrabold text-silver-bright font-mono tabular-nums">{summary.totalApplications}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-muted uppercase">Avg Processing SLA</p>
              <p className="text-2xl font-extrabold text-platinum font-mono tabular-nums">{summary.averageProcessingDurationDays} Days</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-muted uppercase">Critical Attention</p>
              <p className="text-2xl font-extrabold text-status-critical font-mono tabular-nums">
                {summary.riskDistribution?.CRITICAL || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Signature 3D PRISM Core Display */}
        <div className="h-64 lg:h-auto">
          <PrismCore
            activityState={summary.riskDistribution?.CRITICAL > 0 ? 'HIGH_ALERT' : 'NORMAL'}
            className="w-full h-full min-h-[220px]"
          />
        </div>
      </div>

      {/* Primary KPI Grid (Every single metric links to underlying records) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link
          to="/applications?stage=UNDER_SCRUTINY"
          className="platinum-card platinum-card-hover p-4 rounded-xl block border border-graphite-border"
        >
          <div className="flex items-center justify-between text-slate-muted mb-1">
            <span className="text-[11px] font-mono uppercase">Under Scrutiny</span>
            <Activity size={15} className="text-platinum" />
          </div>
          <p className="text-2xl font-bold text-silver-bright font-mono tabular-nums">{summary.pendingScrutiny}</p>
          <span className="text-[10px] text-slate-muted">Queue pending check</span>
        </Link>

        <Link
          to="/applications?stage=CLARIFICATION_REQUIRED"
          className="platinum-card platinum-card-hover p-4 rounded-xl block border border-graphite-border"
        >
          <div className="flex items-center justify-between text-slate-muted mb-1">
            <span className="text-[11px] font-mono uppercase">Deficiencies</span>
            <Clock size={15} className="text-status-warning" />
          </div>
          <p className="text-2xl font-bold text-status-warning font-mono tabular-nums">{summary.clarificationRequired}</p>
          <span className="text-[10px] text-slate-muted">Awaiting institution</span>
        </Link>

        <Link
          to="/evc?status=PENDING_SCHEDULE"
          className="platinum-card platinum-card-hover p-4 rounded-xl block border border-graphite-border"
        >
          <div className="flex items-center justify-between text-slate-muted mb-1">
            <span className="text-[11px] font-mono uppercase">EVC Unscheduled</span>
            <Calendar size={15} className="text-platinum" />
          </div>
          <p className="text-2xl font-bold text-silver-bright font-mono tabular-nums">{summary.evcPendingScheduling}</p>
          <span className="text-[10px] text-slate-muted">Committee pending</span>
        </Link>

        <Link
          to="/evc?status=PENDING_SCHEDULE"
          className="platinum-card platinum-card-hover p-4 rounded-xl block border border-graphite-border"
        >
          <div className="flex items-center justify-between text-slate-muted mb-1">
            <span className="text-[11px] font-mono uppercase">EVC SLA Breach</span>
            <AlertTriangle size={15} className="text-status-critical" />
          </div>
          <p className="text-2xl font-bold text-status-critical font-mono tabular-nums">{summary.evcApproachingDeadline}</p>
          <span className="text-[10px] text-slate-muted">&lt; 5 days window</span>
        </Link>

        <Link
          to="/compliance?status=EXPIRED"
          className="platinum-card platinum-card-hover p-4 rounded-xl block border border-graphite-border"
        >
          <div className="flex items-center justify-between text-slate-muted mb-1">
            <span className="text-[11px] font-mono uppercase">Overdue Oblig.</span>
            <ShieldAlert size={15} className="text-status-critical" />
          </div>
          <p className="text-2xl font-bold text-status-critical font-mono tabular-nums">{summary.overdueObligations}</p>
          <span className="text-[10px] text-slate-muted">Non-compliant</span>
        </Link>

        <Link
          to="/documents?expiryFilter=EXPIRING_30_DAYS"
          className="platinum-card platinum-card-hover p-4 rounded-xl block border border-graphite-border"
        >
          <div className="flex items-center justify-between text-slate-muted mb-1">
            <span className="text-[11px] font-mono uppercase">Expiring Docs</span>
            <FileText size={15} className="text-status-warning" />
          </div>
          <p className="text-2xl font-bold text-status-warning font-mono tabular-nums">{summary.documentsExpiringSoon}</p>
          <span className="text-[10px] text-slate-muted">&lt; 30 days expiry</span>
        </Link>
      </div>

      {/* Visual Analytics & Stage Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Pendency Chart */}
        <div className="lg:col-span-2 platinum-card p-5 rounded-xl border border-graphite-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
              Caseload by Processing Stage
            </h3>
            <span className="text-[11px] font-mono text-slate-muted">Live Stage Breakdown</span>
          </div>
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

        {/* Regional Workload Distribution */}
        <div className="platinum-card p-5 rounded-xl border border-graphite-border flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold mb-4">
              Regional Workload Distribution
            </h3>
            <div className="space-y-3">
              {(summary.regionalDistribution || []).map((r: any) => (
                <div key={r.region} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-slate-muted" />
                    <span>{r.region} Region</span>
                  </div>
                  <span className="font-mono font-bold text-silver-bright bg-gunmetal px-2 py-0.5 rounded">
                    {r.count} cases
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-graphite-border mt-4">
            <Link
              to="/reports"
              className="w-full platinum-button-secondary py-1.5 px-3 rounded text-xs flex items-center justify-center gap-2"
            >
              <span>View Detailed Analytics</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Deadline Risk Radar Preview Table */}
      <div className="platinum-card p-5 rounded-xl border border-graphite-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
              Deadline Risk Radar (Explainable Prioritisation)
            </h3>
            <p className="text-[11px] text-slate-muted">Top applications prioritized by deterministic operational delay risk</p>
          </div>
          <Link to="/risk-radar" className="text-xs text-platinum hover:underline flex items-center gap-1">
            <span>Open Risk Radar</span>
            <ExternalLink size={12} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-graphite-border text-slate-muted font-mono uppercase text-[10px]">
                <th className="py-2 px-3">Application ID</th>
                <th className="py-2 px-3">Institution</th>
                <th className="py-2 px-3">Stage</th>
                <th className="py-2 px-3">Risk Score</th>
                <th className="py-2 px-3">Contributing Delay Factors</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-border">
              {(riskCases || []).slice(0, 5).map((app: any) => (
                <tr key={app.id} className="hover:bg-graphite-hover">
                  <td className="py-3 px-3 font-mono font-semibold text-silver-bright">
                    <Link to={`/applications/${app.id}`} className="hover:text-platinum">
                      {app.applicationNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-medium text-silver truncate max-w-xs">{app.institutionName}</p>
                    <span className="text-[10px] font-mono text-slate-muted">{app.region} Region</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px]">{app.currentStage}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        app.riskCategory === 'CRITICAL'
                          ? 'bg-status-critical/20 text-status-critical border-status-critical/40'
                          : app.riskCategory === 'HIGH'
                          ? 'bg-status-warning/20 text-status-warning border-status-warning/40'
                          : 'bg-gunmetal text-silver border-graphite-border'
                      }`}
                    >
                      {app.riskScore} / 100 [{app.riskCategory}]
                    </span>
                  </td>
                  <td className="py-3 px-3 max-w-md text-slate-muted truncate">
                    {app.riskFactors && app.riskFactors[0] ? app.riskFactors[0] : 'Normal processing trajectory'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      to={`/applications/${app.id}`}
                      className="platinum-button-secondary py-1 px-2.5 rounded text-[11px] font-mono inline-flex items-center gap-1"
                    >
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
export default DashboardPage;
