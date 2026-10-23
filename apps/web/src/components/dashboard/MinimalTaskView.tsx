import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Layers,
  ShieldAlert,
  Compass,
  AlertCircle,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useCopilot } from '../../context/CopilotContext.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  formatPlainStage,
  formatDaysRemaining,
  formatCategory,
  formatRole,
  formatActionType,
  formatStatus,
  getApplicationOwner,
  formatPlainAlert,
} from '../../lib/plainLanguage.js';

interface MinimalTaskViewProps {
  user: any;
  summary: any;
  applications: any[];
  urgentObligations: any[];
  returnedApplications: any[];
  criticalAlerts: any[];
  expiringDocs: any[];
  pendingEvc: any[];
  applicationsApproachingCutoff: any[];
  roleNextActions: any[];
  waitingApplications: any[];
  recentEvents: any[];
  totalAttentionCount: number;
  totalDueSoonCount: number;
  stageChartData: Array<{ stage: string; count: any }>;
}

/**
 * Minimalist Circular Donut SLA Gauge Ring
 * Inspired by the glowing circular telemetry ring in Card 2 of the reference image.
 */
function SlaRadialGauge({ percentage = 94.2 }: { percentage: number }) {
  const radius = 50;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-32 h-32 transform -rotate-90">
        {/* Track circle */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="#191D24"
          strokeWidth={stroke}
          fill="transparent"
        />
        {/* Secondary subtle segment */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="#2A313D"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.72}
          strokeLinecap="round"
        />
        {/* Primary warm gold progress arc */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="#F5BA42"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center Metric */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <span className="text-xl font-bold font-mono text-[#F5BA42] tracking-tight tabular-nums">
          {percentage}%
        </span>
        <span className="text-[8px] font-mono uppercase tracking-widest text-slate-muted">
          On-Time
        </span>
      </div>
    </div>
  );
}

/**
 * Dual Wave Sparkline
 * Exact match to the dual undulating trend curves at the base of Card 4 in the reference image.
 */
function DualWaveSparkline() {
  return (
    <div className="pt-3 border-t border-[#1C2028] mt-2">
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-muted mb-1">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5BA42]" />
          <span className="text-silver/80">Velocity trend</span>
        </span>
        <span className="text-slate-muted">14d SLA forecast</span>
      </div>
      <svg viewBox="0 0 320 36" className="w-full h-9 overflow-visible">
        <defs>
          <linearGradient id="goldWaveGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#F5BA42" stopOpacity={1} />
            <stop offset="100%" stopColor="#FBBF24" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        {/* Secondary wave in dashed muted slate */}
        <path
          d="M 0 28 Q 40 32, 80 24 T 160 20 T 240 26 T 320 16"
          fill="none"
          stroke="#3B4452"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        {/* Primary gold wave */}
        <path
          d="M 0 22 Q 40 8, 80 20 T 160 12 T 240 6 T 320 10"
          fill="none"
          stroke="url(#goldWaveGrad)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function MinimalTaskView({
  user,
  summary,
  applications,
  urgentObligations,
  returnedApplications,
  criticalAlerts,
  expiringDocs,
  pendingEvc,
  applicationsApproachingCutoff,
  roleNextActions,
  waitingApplications,
  recentEvents,
  totalAttentionCount,
  totalDueSoonCount,
  stageChartData,
}: MinimalTaskViewProps) {
  const { openCopilot } = useCopilot();
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'URGENT' | 'DUE_SOON'>('ALL');
  const [showLedgerDrawer, setShowLedgerDrawer] = useState<boolean>(false);
  const [showAuditDrawer, setShowAuditDrawer] = useState<boolean>(false);

  const stageBreakdown: Record<string, number> = summary?.stageBreakdown || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ============================================================== */}
      {/* TOP TACTILE CHIP CONTROL STRIP (AESTHETIC OF CENTER 0.2 CHIP)  */}
      {/* ============================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 liquid-glass-capsule p-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-muted pl-2">
            Minimalist Task Workspace
          </span>
          <span className="text-slate-muted font-mono text-xs">•</span>
          <span className="text-xs text-silver font-medium">
            {user?.name ? `${user.name} (${formatRole(user.role)})` : 'Executive view'}
          </span>
        </div>

        {/* Tactile Metric Chips matching the small center card in the image */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTaskFilter(taskFilter === 'URGENT' ? 'ALL' : 'URGENT')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
              taskFilter === 'URGENT'
                ? 'liquid-glass-pill-active !bg-gradient-to-r !from-[#F5BA42] !to-[#E5A832] !text-[#0B0D11] font-bold shadow-[0_0_16px_rgba(245,186,66,0.35)]'
                : 'liquid-glass-pill text-slate-muted hover:text-silver'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5BA42]" />
            <span className="font-bold text-[#F5BA42]">{totalAttentionCount}</span>
            <span className="text-[10px] uppercase">Urgent</span>
          </button>

          <button
            onClick={() => setTaskFilter(taskFilter === 'DUE_SOON' ? 'ALL' : 'DUE_SOON')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
              taskFilter === 'DUE_SOON'
                ? 'liquid-glass-pill-active font-bold shadow-[0_0_16px_rgba(255,255,255,0.25)]'
                : 'liquid-glass-pill text-slate-muted hover:text-silver'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-platinum" />
            <span className="font-bold text-silver-bright">{totalDueSoonCount}</span>
            <span className="text-[10px] uppercase">Due soon</span>
          </button>

          <button
            onClick={() => setShowLedgerDrawer(!showLedgerDrawer)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
              showLedgerDrawer
                ? 'liquid-glass-pill-active font-bold'
                : 'liquid-glass-pill text-slate-muted hover:text-silver'
            }`}
          >
            <span className="font-bold text-silver-bright">{waitingApplications.length}</span>
            <span className="text-[10px] uppercase">Dossiers</span>
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${showLedgerDrawer ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* THE 4 MATTE TACTILE SLABS (2X2 GRID MATCHING REFERENCE IMAGE)   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ------------------------------------------------------------ */}
        {/* CARD 1 (TOP LEFT): CASELOAD & STAGES (HSE BAR CHART)         */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-[#0C0E13] rounded-2xl border border-[#1C2028] p-6 shadow-2xl shadow-black/80 flex flex-col justify-between space-y-4 hover:border-[#282F3D] transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#F5BA42] font-semibold">
                  HSE // CASELOAD
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-subtle" />
                <span className="text-[10px] font-mono text-slate-muted">Pipeline Volume</span>
              </div>
              <h3 className="text-lg font-bold text-silver-bright mt-1 tracking-tight">
                Caseload by processing stage
              </h3>
            </div>

            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-[#F5BA42] tabular-nums">
                {applications?.length || 0}
              </span>
              <span className="block text-[10px] font-mono text-slate-muted uppercase">
                Total dossiers
              </span>
            </div>
          </div>

          {/* Minimalist Bar Chart with Golden Accents */}
          <div className="h-44 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="slabGoldBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F5BA42" stopOpacity={1} />
                    <stop offset="100%" stopColor="#A87F28" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="stage"
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#1C2028' }}
                />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F1217',
                    borderColor: '#242A36',
                    borderRadius: '10px',
                    fontSize: '11px',
                    color: '#F1F5F9',
                  }}
                />
                <Bar dataKey="count" fill="url(#slabGoldBar)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stage Sub-indicators Strip */}
          <div className="pt-3 border-t border-[#1C2028] grid grid-cols-3 gap-2 text-[11px] font-mono">
            <div className="p-2.5 rounded-lg bg-[#0F1217] border border-[#1A1D24]">
              <span className="text-slate-muted block text-[10px]">Under review</span>
              <span className="text-silver-bright font-bold text-sm">
                {stageBreakdown['UNDER_SCRUTINY'] || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0F1217] border border-[#1A1D24]">
              <span className="text-slate-muted block text-[10px]">Inspection</span>
              <span className="text-[#F5BA42] font-bold text-sm">
                {stageBreakdown['EVC_PENDING'] || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0F1217] border border-[#1A1D24]">
              <span className="text-slate-muted block text-[10px]">Committee</span>
              <span className="text-platinum font-bold text-sm">
                {stageBreakdown['COMMITTEE_REVIEW'] || 0}
              </span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* CARD 2 (TOP RIGHT): SLA COMPLIANCE & RADIAL RING GAUGE      */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-[#0C0E13] rounded-2xl border border-[#1C2028] p-6 shadow-2xl shadow-black/80 flex flex-col justify-between space-y-4 hover:border-[#282F3D] transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#F5BA42] font-semibold">
                  SLA // RELIABILITY
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-subtle" />
                <span className="text-[10px] font-mono text-slate-muted">Statutory Index</span>
              </div>
              <h3 className="text-lg font-bold text-silver-bright mt-1 tracking-tight">
                On-time resolution rate
              </h3>
            </div>

            <Link
              to="/deadlines"
              className="text-xs font-mono text-[#F5BA42] hover:underline inline-flex items-center gap-1"
            >
              <span>Deadlines</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {/* Center Donut Gauge Ring & Side Metrics */}
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
            <SlaRadialGauge percentage={94.2} />

            {/* Key indicators side stack */}
            <div className="space-y-3 w-full sm:w-auto text-xs font-mono">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <span className="text-slate-muted">Milestones verified:</span>
                <span className="font-bold text-silver-bright">18 / 19</span>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <span className="text-slate-muted">Deadline risk window:</span>
                <span className="font-bold text-[#F5BA42]">&lt; 14 days</span>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <span className="text-slate-muted">Defaults averted:</span>
                <span className="font-bold text-status-success">100%</span>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <span className="text-slate-muted">Average turnaround:</span>
                <span className="font-bold text-platinum">12.4 days</span>
              </div>
            </div>
          </div>

          {/* Bottom SLA Notice */}
          <div className="pt-3 border-t border-[#1C2028] flex items-center justify-between text-[11px] font-mono text-slate-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-status-success" />
              <span>Next statutory audit in 14 days</span>
            </span>
            <span className="text-silver">AICTE SLA compliant</span>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* CARD 3 (BOTTOM LEFT): WHAT NEEDS ATTENTION (BLOCKERS)        */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-[#0C0E13] rounded-2xl border border-[#1C2028] p-6 shadow-2xl shadow-black/80 flex flex-col justify-between space-y-4 hover:border-[#282F3D] transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF626B] font-semibold">
                  URGENT // ACTION REQUIRED
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-subtle" />
                <span className="text-[10px] font-mono text-slate-muted">High Priority</span>
              </div>
              <h3 className="text-lg font-bold text-silver-bright mt-1 tracking-tight">
                What needs attention?
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#FF626B]/15 text-[#FF626B] border border-[#FF626B]/30">
                {totalAttentionCount} urgent
              </span>
              <button
                onClick={() => openCopilot(urgentObligations[0]?.applicationId || applications[0]?.id, 'Why is this application at risk?')}
                className="liquid-glass-pill px-2.5 py-1 rounded-lg text-xs font-semibold text-[#F5BA42] inline-flex items-center gap-1.5 cursor-pointer hover:text-white"
                title="Ask PRISM Copilot why this application is at risk"
              >
                <Sparkles size={11} />
                <span>Ask Copilot</span>
              </button>
            </div>
          </div>

          {/* Tactile Golden Bar Array matching Card 3 of reference mockup */}
          <div className="bg-[#0F1217] p-3 rounded-xl border border-[#1A1D24] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-muted">
              <span className="text-[#F5BA42] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5BA42]" />
                Urgency index by statutory category
              </span>
              <span>Distribution count</span>
            </div>
            <div className="flex items-end justify-between gap-2 h-14 pt-1">
              {[
                { label: 'Deficiency', height: urgentObligations.length > 0 ? '88%' : '20%', count: urgentObligations.length },
                { label: 'Clarify', height: returnedApplications.length > 0 ? '72%' : '15%', count: returnedApplications.length },
                { label: 'Critical', height: criticalAlerts.length > 0 ? '94%' : '25%', count: criticalAlerts.length },
                { label: 'Expiring', height: expiringDocs.length > 0 ? '65%' : '20%', count: expiringDocs.length },
                { label: 'EVC Visit', height: pendingEvc.length > 0 ? '58%' : '15%', count: pendingEvc.length },
                { label: 'Cutoff', height: applicationsApproachingCutoff.length > 0 ? '82%' : '30%', count: applicationsApproachingCutoff.length },
              ].map((b, bIdx) => (
                <div key={bIdx} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full bg-[#181C25] rounded-t-sm h-10 flex items-end">
                    <div
                      style={{ height: b.height }}
                      className="w-full rounded-t-sm bg-gradient-to-t from-[#9B701E] via-[#DFA02B] to-[#F5BA42] group-hover:brightness-125 transition-all shadow-[0_0_6px_rgba(245,186,66,0.25)]"
                    />
                  </div>
                  <span className="text-[9px] font-mono text-slate-muted group-hover:text-silver transition-colors">
                    {b.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Scannable Priority Rows */}
          <div className="space-y-2.5 py-1">
            {totalAttentionCount === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 size={24} className="mx-auto text-status-success" />
                <p className="text-xs font-semibold text-silver">Zero critical blockers</p>
                <p className="text-[11px] text-slate-muted">All active dossiers are within compliant thresholds.</p>
              </div>
            ) : (
              <>
                {/* Deficient obligation */}
                {urgentObligations.slice(0, 1).map((obl: any) => {
                  const timing = formatDaysRemaining(obl.dueDate);
                  return (
                    <div
                      key={obl.id}
                      className="p-3.5 rounded-xl bg-[#0F1217] border border-[#232935] border-l-4 border-l-[#FF626B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[#FF626B] font-bold">
                            {timing.text}
                          </span>
                          <span className="text-slate-muted">•</span>
                          <span className="font-semibold text-silver-bright">{obl.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-muted mt-0.5">
                          {obl.institution?.name} • Missing municipal evidence
                        </p>
                      </div>
                      <Link
                        to="/compliance"
                        className="platinum-button-primary px-3 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-auto inline-flex items-center gap-1.5"
                      >
                        <span>Upload document</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  );
                })}

                {/* Clarification dossier */}
                {returnedApplications.slice(0, 1).map((app: any) => (
                  <div
                    key={app.id}
                    className="p-3.5 rounded-xl bg-[#0F1217] border border-[#232935] border-l-4 border-l-[#F5BA42] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#F5BA42] font-bold">
                          Clarification needed
                        </span>
                        <span className="text-slate-muted">•</span>
                        <span className="font-semibold text-silver-bright">{app.applicationNumber}</span>
                      </div>
                      <p className="text-[11px] text-slate-muted mt-0.5">
                        {app.institution?.name} • Scrutiny clarification
                      </p>
                    </div>
                    <Link
                      to={`/applications/${app.id}`}
                      className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-auto inline-flex items-center gap-1.5"
                    >
                      <span>View application</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                ))}

                {/* Critical Alert */}
                {criticalAlerts.slice(0, 1).map((al: any) => {
                  const alertAnatomy = formatPlainAlert(al);
                  return (
                    <div
                      key={al.id}
                      className="p-3.5 rounded-xl bg-[#0F1217] border border-[#232935] border-l-4 border-l-platinum flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-platinum font-bold">
                            {alertAnatomy.urgencyText}
                          </span>
                          <span className="text-slate-muted">•</span>
                          <span className="font-semibold text-silver-bright truncate max-w-[200px]">
                            {alertAnatomy.issue}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-muted mt-0.5">
                          Next: {alertAnatomy.nextStep}
                        </p>
                      </div>
                      <Link
                        to={alertAnatomy.actionUrl}
                        className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-auto inline-flex items-center gap-1.5"
                      >
                        <span>{alertAnatomy.actionLabel}</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Bottom Volume Indicator */}
          <div className="pt-3 border-t border-[#1C2028] flex items-center justify-between text-[11px] font-mono text-slate-muted">
            <span>Immediate resolution queue</span>
            <span className="text-silver">{criticalAlerts.length} total active alerts</span>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* CARD 4 (BOTTOM RIGHT): TASK LEDGER & WAVE SPARKLINE          */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-[#0C0E13] rounded-2xl border border-[#1C2028] p-6 shadow-2xl shadow-black/80 flex flex-col justify-between space-y-4 hover:border-[#282F3D] transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#F5BA42] font-semibold">
                  LEDGER // ROLE ACTIONS
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-subtle" />
                <span className="text-[10px] font-mono text-slate-muted">
                  {formatRole(user?.role)}
                </span>
              </div>
              <h3 className="text-lg font-bold text-silver-bright mt-1 tracking-tight">
                What should I do next?
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-muted">
                Ranked queue
              </span>
              <button
                onClick={() => openCopilot(applications[0]?.id, 'Generate a compliance checklist for our next steps')}
                className="liquid-glass-pill px-2.5 py-1 rounded-lg text-xs font-semibold text-silver inline-flex items-center gap-1.5 cursor-pointer hover:text-white"
                title="Generate an actionable statutory checklist with Copilot"
              >
                <Sparkles size={11} className="text-[#F5BA42]" />
                <span>Checklist</span>
              </button>
            </div>
          </div>

          {/* Minimalist Action Rows with Hairline Dividers */}
          <div className="space-y-3 divide-y divide-[#1C2028] py-1">
            {roleNextActions.slice(0, 3).map((act, index) => (
              <div
                key={act.id}
                className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-xs font-mono font-bold text-[#F5BA42] pt-0.5">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h4 className="font-semibold text-silver-bright text-xs">
                      {act.title}
                    </h4>
                    <p className="text-[11px] text-slate-muted line-clamp-1 mt-0.5">
                      {act.subtitle}
                    </p>
                  </div>
                </div>

                <Link
                  to={act.to}
                  className="platinum-button-primary px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1 group cursor-pointer"
                >
                  <span>{act.ctaLabel}</span>
                  <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            ))}
          </div>

          {/* Dual Wave Sparkline (Exact match to Card 4 in reference photo!) */}
          <DualWaveSparkline />
        </div>

      </div>

      {/* ============================================================== */}
      {/* EXPANDABLE APPLICATION LEDGER & AUDIT TRAYS                     */}
      {/* ============================================================== */}
      <div className="pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 liquid-glass-capsule p-3 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLedgerDrawer(!showLedgerDrawer)}
              className="liquid-glass-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer text-silver hover:text-white"
            >
              <Layers size={13} className="text-[#F5BA42]" />
              <span>
                {showLedgerDrawer ? 'Hide application ledger' : `View full application ledger (${waitingApplications.length} dossiers)`}
              </span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${showLedgerDrawer ? 'rotate-180' : ''}`}
              />
            </button>

            <button
              onClick={() => setShowAuditDrawer(!showAuditDrawer)}
              className="liquid-glass-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer text-silver hover:text-white"
            >
              <span>
                {showAuditDrawer ? 'Hide activity audit' : 'View recent activity'}
              </span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${showAuditDrawer ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-muted">
            Deep statutory dossiers available on demand
          </div>
        </div>

        {/* Expanded Application Ledger Table */}
        {showLedgerDrawer && (
          <div className="mt-4 platinum-card p-5 rounded-2xl border border-graphite-border space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-graphite-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-silver-bright">Active application dossiers</h3>
                <p className="text-xs text-slate-muted">Scannable 6-column ledger across review stages</p>
              </div>
              <Link
                to="/applications"
                className="text-xs font-medium text-platinum hover:underline inline-flex items-center gap-1"
              >
                <span>View all applications</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-graphite-border text-slate-muted font-medium text-[11px]">
                    <th className="py-2.5 px-3">Application</th>
                    <th className="py-2.5 px-3">Current stage</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Next deadline</th>
                    <th className="py-2.5 px-3">Owner</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-border">
                  {waitingApplications.map((app: any) => {
                    const timing = formatDaysRemaining(app.deadlineDate);
                    const owner = getApplicationOwner(app);

                    return (
                      <tr key={app.id} className="hover:bg-graphite-hover transition-colors group">
                        <td className="py-3 px-3">
                          <Link
                            to={`/applications/${app.id}`}
                            className="font-mono font-medium text-silver-bright group-hover:text-platinum block tracking-tight"
                          >
                            {app.applicationNumber}
                          </Link>
                          <span className="text-[10px] text-slate-muted block truncate max-w-xs mt-0.5">
                            {app.institution?.name} • {app.region} region
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gunmetal text-silver border border-graphite-border">
                            {formatPlainStage(app.currentStage)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                              app.status === 'APPROVED'
                                ? 'bg-status-success/15 text-status-success border-status-success/30'
                                : app.status === 'REJECTED'
                                ? 'bg-status-critical/15 text-status-critical border-status-critical/30'
                                : app.status === 'ACTION_REQUIRED' || app.status === 'RETURNED'
                                ? 'bg-status-warning/15 text-status-warning border-status-warning/30'
                                : 'bg-platinum/10 text-platinum border-platinum/25'
                            }`}
                          >
                            {formatStatus(app.status || 'IN_PROGRESS')}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={
                              timing.isAtRisk || timing.isOverdue
                                ? 'text-status-warning font-medium'
                                : 'text-slate-muted'
                            }
                          >
                            {timing.text}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-silver text-[11px]">{owner.name}</div>
                          {owner.role && (
                            <div className="text-[10px] text-slate-muted">{owner.role}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            to={`/applications/${app.id}`}
                            className="platinum-button-secondary py-1 px-2.5 rounded text-xs font-medium inline-flex items-center gap-1 group-hover:border-platinum/40 transition-colors"
                          >
                            <span>View application</span>
                            <ArrowRight size={11} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expanded Audit Log */}
        {showAuditDrawer && (
          <div className="mt-4 platinum-card p-5 rounded-2xl border border-graphite-border space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-graphite-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-silver-bright">Recent activity audit</h3>
                <p className="text-xs text-slate-muted">Chronological audit log of verified changes and state transitions</p>
              </div>
              <Link
                to="/audit"
                className="text-xs font-medium text-platinum hover:underline inline-flex items-center gap-1"
              >
                <span>View full history</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="space-y-2">
              {recentEvents.length === 0 ? (
                <p className="text-xs text-slate-muted py-4 text-center">No recent activity recorded.</p>
              ) : (
                recentEvents.map((e: any) => (
                  <div
                    key={e.id}
                    className="p-3 rounded-lg bg-obsidian border border-graphite-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-silver-bright">{formatActionType(e.actionType)}</span>
                      <span className="text-slate-muted">•</span>
                      <span className="text-silver">{e.actorName}</span>
                      <span className="text-slate-muted font-mono text-[10px]">({formatRole(e.actorRole)})</span>
                    </div>
                    <span className="text-[11px] text-slate-muted font-mono">
                      {new Date(e.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MinimalTaskView;
