import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  FileCheck,
  Globe,
  Layers,
  ListTodo,
  Shield,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  formatPlainStage,
  formatDaysRemaining,
  formatPlainComplianceStatus,
  formatPlainAlert,
  formatCategory,
  formatRole,
  formatSeverity,
  formatActionType,
  formatStatus,
  getApplicationOwner,
} from '../lib/plainLanguage.js';
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
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'TASK_FIRST' | '3D_HOLODECK' | 'ANALYTICS'>('TASK_FIRST');
  const [selectedCase, setSelectedCase] = useState<SpatialCaseNode | null>(null);
  const [temporalOffset, setTemporalOffset] = useState<number>(0);
  const [activeIntervention, setActiveIntervention] = useState<'NONE' | 'FAST_TRACK_EVC' | 'SPECIAL_SCRUTINY_DRIVE' | 'PROVISIONAL_UNDERTAKING'>('NONE');
  const [showSecondaryAnalytics, setShowSecondaryAnalytics] = useState<boolean>(false);

  // 1. Dashboard summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiRequest<any>('/dashboard/summary'),
    refetchInterval: 15000,
  });

  // 2. Unresolved Alerts
  const { data: alertsData } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => apiRequest<any[]>('/alerts?status=UNRESOLVED'),
  });

  // 3. Applications
  const { data: applications, isLoading: isAppsLoading } = useQuery({
    queryKey: ['dashboard-apps'],
    queryFn: () => apiRequest<any[]>('/applications?limit=20'),
  });

  // 4. Compliance Obligations
  const { data: obligationsData } = useQuery({
    queryKey: ['dashboard-compliance'],
    queryFn: () => apiRequest<any[]>('/compliance'),
  });

  // 5. Expiring Documents
  const { data: expiringDocsData } = useQuery({
    queryKey: ['dashboard-expiring-docs'],
    queryFn: () => apiRequest<any[]>('/documents?expiryFilter=EXPIRING_30_DAYS'),
  });

  // 6. EVC Pending Visits
  const { data: pendingEvcData } = useQuery({
    queryKey: ['dashboard-pending-evc'],
    queryFn: () => apiRequest<any[]>('/evc?status=PENDING_SCHEDULE'),
  });

  // 7. Recent activity log
  const { data: auditData } = useQuery({
    queryKey: ['dashboard-recent-activity'],
    queryFn: () => apiRequest<any>('/audit?limit=5'),
  });

  // Map backend application data to Spatial 3D Nodes
  const spatialNodes: SpatialCaseNode[] = (applications || []).map((app: any) => {
    const isVjti = app.applicationNumber?.includes('WRO-0491');
    const isDiaem = app.applicationNumber?.includes('NRO-1104');
    const deadlineDiff = app.deadlineDate
      ? Math.ceil((new Date(app.deadlineDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 12;

    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      institutionName: app.institution?.name || 'Institution',
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
        <span>Loading workspace dashboard...</span>
      </div>
    );
  }

  // --- QUESTION 1: WHAT NEEDS MY ATTENTION? (Urgent Blockers, Deficiencies & Overdue Issues) ---
  const urgentObligations = (obligationsData || []).filter(
    (o: any) => o.status === 'DEFICIENT' || o.status === 'EXPIRED'
  );

  const returnedApplications = (applications || []).filter(
    (a: any) => a.currentStage === 'CLARIFICATION_REQUIRED'
  );

  const criticalAlerts = (alertsData || []).filter(
    (al: any) => al.severity === 'CRITICAL' || al.severity === 'WARNING'
  );

  const totalAttentionCount =
    urgentObligations.length + returnedApplications.length + criticalAlerts.length;

  // --- QUESTION 2: WHAT IS DUE SOON? (Deadlines within 30 days) ---
  const expiringDocs = (expiringDocsData || []).slice(0, 4);
  const pendingEvc = (pendingEvcData || []).slice(0, 3);
  const applicationsApproachingCutoff = (applications || [])
    .filter((a: any) => {
      if (!a.deadlineDate) return false;
      const diffDays = Math.ceil((new Date(a.deadlineDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 14;
    })
    .slice(0, 3);

  const totalDueSoonCount =
    expiringDocs.length + pendingEvc.length + applicationsApproachingCutoff.length;

  // --- QUESTION 3: WHICH APPLICATIONS ARE WAITING? ---
  const waitingApplications = (applications || []).filter(
    (a: any) =>
      a.status !== 'APPROVED' &&
      a.status !== 'REJECTED' &&
      a.status !== 'CLOSED' &&
      a.currentStage !== 'DRAFT'
  ).slice(0, 6);

  // --- QUESTION 4: WHAT SHOULD I DO NEXT? (Role-Specific Guided Decision Queue) ---
  const isOfficer = user?.role === 'REGIONAL_OFFICER' || user?.role === 'BUREAU_OFFICER';
  const isInstitution = user?.role === 'INSTITUTION_USER';

  const roleNextActions = (() => {
    if (isOfficer) {
      return [
        {
          id: 'scrutiny-priority',
          priority: 'Priority 1',
          urgencyColor: 'text-platinum border-platinum/40 bg-platinum/10',
          title: 'Review application for VJTI',
          subtitle: 'APP-2025-WRO-0491 • Extension of approval',
          reason: 'All technical and financial records are indexed. Record regulatory review to prevent deadline breach.',
          ctaLabel: 'View application',
          to: '/applications',
          badge: 'Under review',
        },
        {
          id: 'evc-appointment',
          priority: 'Priority 2',
          urgencyColor: 'text-status-warning border-status-warning/40 bg-status-warning/10',
          title: 'Schedule inspection team',
          subtitle: 'APP-2025-NRO-1104 • Delhi Institute of Advanced Architecture',
          reason: 'Initial review cleared. Assign expert committee panel before the 5-day inspection deadline.',
          ctaLabel: 'Schedule inspection',
          to: '/evc',
          badge: 'Inspection pending',
        },
        {
          id: 'deficiency-verification',
          priority: 'Priority 3',
          urgencyColor: 'text-slate-muted border-slate-muted/40 bg-gunmetal',
          title: 'Verify land lease submission',
          subtitle: 'OBL-WRO-2025-01 • Institutional compliance evidence',
          reason: 'Institution uploaded renewed municipal lease deed. Mark verified or request clarification.',
          ctaLabel: 'Verify document',
          to: '/compliance',
          badge: 'Waiting for review',
        },
      ];
    }

    if (isInstitution) {
      return [
        {
          id: 'clarification-response',
          priority: 'Priority 1',
          urgencyColor: 'text-status-critical border-status-critical/40 bg-status-critical/10',
          title: 'Respond to officer clarification notice',
          subtitle: 'APP-2025-WRO-0491 • Clarification needed',
          reason: 'Regional office noted missing building occupancy certificate. Upload proof within 7 days.',
          ctaLabel: 'Upload document',
          to: '/compliance',
          badge: 'Clarification needed',
        },
        {
          id: 'doc-renewal',
          priority: 'Priority 2',
          urgencyColor: 'text-status-warning border-status-warning/40 bg-status-warning/10',
          title: 'Renew municipal fire safety certificate',
          subtitle: 'Current certificate expires in 8 calendar days',
          reason: 'Regulatory compliance requires an active fire safety clearance. Submit renewal proof.',
          ctaLabel: 'Upload document',
          to: '/documents',
          badge: 'Expiring soon',
        },
        {
          id: 'evc-readiness',
          priority: 'Priority 3',
          urgencyColor: 'text-slate-muted border-slate-muted/40 bg-gunmetal',
          title: 'Prepare inspection checklist',
          subtitle: 'On-site committee inspection checklist',
          reason: 'Verify physical laboratory hardware and faculty records before the expert team visit.',
          ctaLabel: 'View inspection details',
          to: '/evc',
          badge: 'Inspection ready',
        },
      ];
    }

    // Default / System Administrator & Auditor
    return [
      {
        id: 'admin-intervention',
        priority: 'Priority 1',
        urgencyColor: 'text-platinum border-platinum/40 bg-platinum/10',
        title: 'Run what-if simulation for regional backlog',
        subtitle: '2 applications in Western & Northern zones near deadline',
        reason: 'Provisional undertaking simulation projects recovering 14 days and preventing default.',
        ctaLabel: 'Run simulation',
        to: '/futurelab',
        badge: 'What-if simulation',
      },
      {
        id: 'alert-resolution',
        priority: 'Priority 2',
        urgencyColor: 'text-status-critical border-status-critical/40 bg-status-critical/10',
        title: 'Acknowledge urgent deadline escalations',
        subtitle: '3 high-urgency notifications waiting for review',
        reason: 'Escalations have exceeded 48 hours without administrative acknowledgement.',
        ctaLabel: 'Review alerts',
        to: '/alerts',
        badge: 'Action required',
      },
      {
        id: 'regional-balance',
        priority: 'Priority 3',
        urgencyColor: 'text-slate-muted border-slate-muted/40 bg-gunmetal',
        title: 'Balance regional review caseloads',
        subtitle: 'Western region at 38% capacity vs Southern at 12%',
        reason: 'Reallocate pending dossiers to maintain uniform 7-day average turnaround.',
        ctaLabel: 'View risk monitoring',
        to: '/risk-radar',
        badge: 'Workload balance',
      },
    ];
  })();

  const stageChartData = Object.entries(summary?.stageBreakdown || {}).map(([stage, count]) => ({
    stage: formatPlainStage(stage),
    count,
  }));

  const recentEvents = auditData?.data || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-graphite-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gunmetal border border-graphite-border flex items-center justify-center">
              <span className="font-mono font-bold text-silver-bright text-base">Δ</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-silver-bright tracking-tight">Executive dashboard</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-gunmetal text-platinum border border-graphite-border">
                  Task overview
                </span>
              </div>
              <p className="text-xs text-slate-muted">
                {user?.name ? `${user.name} • ${formatRole(user.role)}` : 'Regulatory status and operational tasks'}
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Selector: Task-First vs 3D Holodeck vs Telemetry */}
        <div className="flex items-center gap-1.5 bg-graphite p-1 rounded-xl border border-graphite-border self-start md:self-auto">
          <button
            onClick={() => setViewMode('TASK_FIRST')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'TASK_FIRST'
                ? 'bg-platinum text-obsidian font-semibold'
                : 'text-slate-muted hover:text-silver'
            }`}
          >
            <ListTodo size={14} />
            <span>Task view</span>
          </button>

          <button
            onClick={() => setViewMode('3D_HOLODECK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === '3D_HOLODECK'
                ? 'bg-platinum text-obsidian font-semibold'
                : 'text-slate-muted hover:text-silver'
            }`}
          >
            <Globe size={14} />
            <span>3D Holodeck</span>
          </button>

          <button
            onClick={() => setViewMode('ANALYTICS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'ANALYTICS'
                ? 'bg-platinum text-obsidian font-semibold'
                : 'text-slate-muted hover:text-silver'
            }`}
          >
            <BarChart3 size={14} />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* Meaningful Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="platinum-card p-3.5 rounded-xl border border-status-critical/30 bg-status-critical/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-status-critical flex items-center gap-1.5">
              <AlertCircle size={13} />
              Needs attention
            </span>
            <span className="w-2 h-2 rounded-full bg-status-critical" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-status-critical tabular-nums">
              {totalAttentionCount}
            </span>
            <span className="text-xs text-slate-muted">urgent items</span>
          </div>
        </div>

        <div className="platinum-card p-3.5 rounded-xl border border-status-warning/30 bg-status-warning/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-status-warning flex items-center gap-1.5">
              <Clock size={13} />
              Due soon
            </span>
            <span className="text-[10px] font-mono text-status-warning">&lt; 14 days</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-status-warning tabular-nums">
              {totalDueSoonCount}
            </span>
            <span className="text-xs text-slate-muted">deadlines approaching</span>
          </div>
        </div>

        <div className="platinum-card p-3.5 rounded-xl border border-graphite-border bg-graphite/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-platinum flex items-center gap-1.5">
              <Layers size={13} />
              Applications waiting
            </span>
            <span className="text-[10px] font-mono text-slate-muted">In progress</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-silver-bright tabular-nums">
              {waitingApplications.length}
            </span>
            <span className="text-xs text-slate-muted">active dossiers</span>
          </div>
        </div>

        <div className="platinum-card p-3.5 rounded-xl border border-status-success/30 bg-status-success/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-status-success flex items-center gap-1.5">
              <Shield size={13} />
              Compliance health
            </span>
            <span className="text-[10px] font-mono text-status-success">Verifiable</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-status-success tabular-nums">94.2%</span>
            <span className="text-xs text-slate-muted">audit rate</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. PRIMARY TASK-FIRST VIEW (QUESTIONS: ATTENTION, DUE, ACTIONS) */}
      {/* ============================================================== */}
      {viewMode === 'TASK_FIRST' && (
        <div className="space-y-6">
          {/* Three Questions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* -------------------------------------------------------- */}
            {/* QUESTION 1: WHAT NEEDS MY ATTENTION?                    */}
            {/* -------------------------------------------------------- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-status-critical/30 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-status-critical/15 text-status-critical flex items-center justify-center font-bold">
                    <ShieldAlert size={14} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-silver-bright">What needs attention?</h2>
                    <p className="text-[11px] text-slate-muted">Urgent compliance issues and blockers</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-status-critical/15 text-status-critical border border-status-critical/30">
                  {totalAttentionCount} urgent
                </span>
              </div>

              {totalAttentionCount === 0 ? (
                <div className="platinum-card p-6 rounded-xl border border-graphite-border text-center space-y-2">
                  <CheckCircle2 size={24} className="mx-auto text-status-success" />
                  <p className="text-xs font-semibold text-silver">Zero critical blockers</p>
                  <p className="text-[11px] text-slate-muted">All statutory obligations and applications are within safe limits.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Deficient / Overdue Obligations */}
                  {urgentObligations.map((obl: any) => {
                    const statusInfo = formatPlainComplianceStatus(obl.status, obl.dueDate);
                    const timing = formatDaysRemaining(obl.dueDate);

                    return (
                      <div
                        key={obl.id}
                        className="platinum-card p-3.5 rounded-xl border border-status-critical/40 bg-status-critical/5 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusInfo.badgeStyle}`}>
                            {statusInfo.label}
                          </span>
                          <span className="text-[10px] font-mono text-status-critical font-semibold">
                            {timing.text}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-silver-bright">{obl.title}</h4>
                          <p className="text-[11px] text-slate-muted line-clamp-1 mt-0.5">
                            {obl.institution?.name} • Category: {formatCategory(obl.category)}
                          </p>
                        </div>

                        <div className="p-2 rounded bg-obsidian border border-graphite-border text-[11px] text-platinum">
                          {statusInfo.nextAction}
                        </div>

                        <Link
                          to="/compliance"
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-status-critical hover:text-white transition-colors pt-1 border-t border-status-critical/20 w-full"
                        >
                          <span>Upload document</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    );
                  })}

                  {/* Clarification Required Applications */}
                  {returnedApplications.map((app: any) => (
                    <div
                      key={app.id}
                      className="platinum-card p-3.5 rounded-xl border border-status-warning/40 bg-status-warning/5 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-status-warning/20 text-status-warning border border-status-warning/30">
                          Clarification needed
                        </span>
                        <span className="text-[10px] font-mono text-silver">{app.applicationNumber}</span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-silver-bright">{app.institution?.name}</h4>
                        <p className="text-[11px] text-slate-muted line-clamp-2 mt-0.5">
                          {app.returnReason || 'Scrutiny identified missing structural safety proof. Awaiting response.'}
                        </p>
                      </div>

                      <div className="p-2 rounded bg-obsidian border border-graphite-border text-[11px] text-status-warning">
                        Next action: Upload requested clarification documents in case dossier
                      </div>

                      <Link
                        to={`/applications/${app.id}`}
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-status-warning hover:text-white transition-colors pt-1 border-t border-status-warning/20 w-full"
                      >
                        <span>View application</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  ))}

                  {/* High Severity Alerts with 4-Part Structure */}
                  {criticalAlerts.slice(0, 2).map((al: any) => {
                    const alertAnatomy = formatPlainAlert(al);

                    return (
                      <div
                        key={al.id}
                        className="platinum-card p-3.5 rounded-xl border border-graphite-border space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gunmetal text-status-critical border border-status-critical/30">
                            {alertAnatomy.urgencyText}
                          </span>
                          <span className="text-[10px] text-slate-muted">
                            Level {al.escalationLevel}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-silver-bright">{alertAnatomy.issue}</p>
                          <p className="text-[11px] text-slate-muted mt-1 leading-relaxed">
                            <span className="text-platinum font-medium">Why it matters: </span>
                            {alertAnatomy.whyItMatters}
                          </p>
                        </div>

                        <div className="p-2 rounded bg-obsidian border border-graphite-border text-[10px] text-slate-muted flex items-center justify-between">
                          <span className="truncate max-w-[200px]">Owner: {alertAnatomy.owner}</span>
                          <span className="text-platinum font-medium">{alertAnatomy.actionLabel}</span>
                        </div>

                        <Link
                          to={alertAnatomy.actionUrl}
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-platinum hover:text-white transition-colors w-full border-t border-graphite-border pt-1.5"
                        >
                          <span>{alertAnatomy.actionLabel}</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* -------------------------------------------------------- */}
            {/* QUESTION 2: WHAT IS DUE SOON?                           */}
            {/* -------------------------------------------------------- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-status-warning/30 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-status-warning/15 text-status-warning flex items-center justify-center font-bold">
                    <Clock size={14} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-silver-bright">What is due soon?</h2>
                    <p className="text-[11px] text-slate-muted">Approaching milestones and document expiries</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-status-warning/15 text-status-warning border border-status-warning/30">
                  {totalDueSoonCount} due soon
                </span>
              </div>

              <div className="space-y-3">
                {/* Expiring Legal Documents */}
                {expiringDocs.map((doc: any) => {
                  const timing = formatDaysRemaining(doc.expiryDate);

                  return (
                    <div
                      key={doc.id}
                      className="platinum-card p-3.5 rounded-xl border border-graphite-border space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          timing.isAtRisk
                            ? 'bg-status-warning/20 text-status-warning border-status-warning/40'
                            : 'bg-gunmetal text-silver border-graphite-border'
                        }`}>
                          {timing.text}
                        </span>
                        <span className="text-[10px] text-slate-muted">{formatCategory(doc.category)}</span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-silver-bright">{doc.title}</h4>
                        <p className="text-[11px] text-slate-muted line-clamp-1 mt-0.5">
                          {doc.institution?.name} • File: {doc.fileName}
                        </p>
                      </div>

                      <div className="p-2 rounded bg-obsidian border border-graphite-border text-[11px] text-platinum">
                        Next action: Upload renewed municipal or legal certificate
                      </div>

                      <Link
                        to="/deadlines"
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-platinum hover:text-white transition-colors pt-1 border-t border-graphite-border w-full"
                      >
                        <span>Upload document</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  );
                })}

                {/* EVC Visits Pending Committee Assignment */}
                {pendingEvc.map((evc: any) => {
                  const timing = formatDaysRemaining(evc.schedulingDeadline);

                  return (
                    <div
                      key={evc.id}
                      className="platinum-card p-3.5 rounded-xl border border-graphite-border space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          timing.isAtRisk
                            ? 'bg-status-warning/20 text-status-warning border-status-warning/40'
                            : 'bg-platinum/15 text-platinum border-platinum/30'
                        }`}>
                          {timing.text}
                        </span>
                        <span className="text-[10px] text-slate-muted">
                          {evc.application?.region} region
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-silver-bright">
                          {evc.application?.institution?.name}
                        </h4>
                        <p className="text-[11px] text-slate-muted line-clamp-1 mt-0.5">
                          App: {evc.application?.applicationNumber} • 3-expert committee required
                        </p>
                      </div>

                      <div className="p-2 rounded bg-obsidian border border-graphite-border text-[11px] text-platinum">
                        Next action: Appoint committee lead and confirm inspection window
                      </div>

                      <Link
                        to="/evc"
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-platinum hover:text-white transition-colors pt-1 border-t border-graphite-border w-full"
                      >
                        <span>Schedule inspection</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  );
                })}

                {/* Applications Approaching Cutoff */}
                {applicationsApproachingCutoff.map((app: any) => {
                  const timing = formatDaysRemaining(app.deadlineDate);

                  return (
                    <div
                      key={app.id}
                      className="platinum-card p-3.5 rounded-xl border border-graphite-border space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gunmetal text-silver border border-graphite-border">
                          {formatPlainStage(app.currentStage)}
                        </span>
                        <span className="text-[10px] font-mono font-medium text-status-warning">
                          {timing.text}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-silver-bright truncate">
                          {app.institution?.name}
                        </p>
                        <p className="text-[11px] text-slate-muted">
                          Dossier #{app.applicationNumber}
                        </p>
                      </div>

                      <div className="p-2 rounded bg-obsidian border border-graphite-border text-[11px] text-platinum">
                        Next action: Complete review before stage cutoff date
                      </div>

                      <Link
                        to={`/applications/${app.id}`}
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-platinum hover:text-white transition-colors border-t border-graphite-border pt-1.5 w-full"
                      >
                        <span>View application</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* -------------------------------------------------------- */}
            {/* QUESTION 4: WHAT SHOULD I DO NEXT?                      */}
            {/* -------------------------------------------------------- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-graphite-border pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-gunmetal text-silver-bright flex items-center justify-center font-bold">
                    <Compass size={14} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-silver-bright">What should I do next?</h2>
                    <p className="text-[11px] text-slate-muted">Ranked action queue for your role</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-gunmetal text-platinum border border-graphite-border">
                  {roleNextActions.length} actions
                </span>
              </div>

              <div className="space-y-3">
                {roleNextActions.map((action, idx) => {
                  const isTop = idx === 0;

                  return (
                    <div
                      key={action.id}
                      className={`platinum-card p-4 rounded-xl border space-y-3 transition-colors ${
                        isTop
                          ? 'border-platinum/40 bg-gunmetal/40'
                          : 'border-graphite-border hover:border-platinum/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border ${action.urgencyColor}`}
                        >
                          {action.priority}
                        </span>
                        <span className="text-[10px] text-slate-muted">{action.badge}</span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-silver-bright">{action.title}</h4>
                        <p className="text-[11px] font-medium text-platinum mt-0.5">{action.subtitle}</p>
                        <p className="text-[11px] text-slate-muted mt-1 leading-relaxed">{action.reason}</p>
                      </div>

                      <div className="pt-2 border-t border-graphite-border flex items-center justify-between">
                        <Link
                          to={action.to}
                          className="w-full py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors platinum-button-primary"
                        >
                          <span>{action.ctaLabel}</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ============================================================== */}
          {/* QUESTION 3: WHICH APPLICATIONS ARE WAITING?                    */}
          {/* ============================================================== */}
          <div className="platinum-card p-5 rounded-2xl border border-graphite-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-graphite-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-silver-bright">Which applications are waiting?</h3>
                <p className="text-xs text-slate-muted">Active institutional dossiers in progress across review stages</p>
              </div>
              <Link
                to="/applications"
                className="text-xs font-medium text-platinum hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
              >
                <span>View all applications</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {waitingApplications.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-muted">
                No applications currently waiting. All dossiers are finalized.
              </div>
            ) : (
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
            )}
          </div>

          {/* ============================================================== */}
          {/* COMPACT RECENT ACTIVITY FEED                                   */}
          {/* ============================================================== */}
          <div className="platinum-card p-5 rounded-2xl border border-graphite-border space-y-3">
            <div className="flex items-center justify-between border-b border-graphite-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-silver-bright">Recent activity</h3>
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

          {/* Secondary Telemetry (Collapsible) */}
          <div className="pt-2 border-t border-graphite-border">
            <button
              onClick={() => setShowSecondaryAnalytics(!showSecondaryAnalytics)}
              className="flex items-center justify-between w-full py-2.5 px-4 rounded-xl bg-graphite/40 border border-graphite-border hover:border-platinum/30 text-xs text-slate-muted hover:text-silver transition-all"
            >
              <span className="flex items-center gap-2">
                <BarChart3 size={14} className="text-platinum" />
                <span>Secondary analytics (caseload by stage and regional workload)</span>
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${showSecondaryAnalytics ? 'rotate-180' : ''}`}
              />
            </button>

            {showSecondaryAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 animate-in fade-in duration-300">
                <div className="platinum-card p-5 rounded-2xl border border-graphite-border space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-platinum">
                    Caseload by processing stage
                  </h3>
                  <div className="h-60">
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
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-platinum">
                    Regional workload distribution
                  </h3>
                  <div className="space-y-3">
                    {(summary?.regionalDistribution || []).map((r: any) => (
                      <div key={r.region} className="flex items-center justify-between text-xs">
                        <span className="text-silver">{r.region} region</span>
                        <span className="font-mono font-medium text-silver-bright bg-gunmetal px-2.5 py-1 rounded">
                          {r.count} applications
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. 3D SPATIAL HOLODECK VIEW (INTERACTIVE 4D SIMULATION)         */}
      {/* ============================================================== */}
      {viewMode === '3D_HOLODECK' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-xs text-slate-muted bg-gunmetal/40 px-3 py-2 rounded-xl border border-graphite-border">
            <span>Spatial orbital nodes represent active institutional applications. Drag to rotate, scroll to zoom.</span>
            <span className="text-platinum font-medium">Click node to open dossier</span>
          </div>

          <div className="h-[520px] w-full relative rounded-2xl overflow-hidden border border-graphite-border">
            <SpatialHolodeck
              cases={spatialNodes}
              onSelectCase={(c) => setSelectedCase(c)}
              selectedCaseId={selectedCase?.id}
              temporalOffsetDays={temporalOffset}
              activeIntervention={activeIntervention}
            />
          </div>

          <ChronosScrubber
            temporalOffset={temporalOffset}
            onChangeOffset={(val) => setTemporalOffset(val)}
            activeIntervention={activeIntervention}
            onChangeIntervention={(intv) => setActiveIntervention(intv)}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. EXECUTIVE TELEMETRY & ANALYTICS VIEW                         */}
      {/* ============================================================== */}
      {viewMode === 'ANALYTICS' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="platinum-card p-5 rounded-2xl border border-graphite-border space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-platinum">
                Caseload by processing stage
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
              <h3 className="text-xs font-semibold uppercase tracking-wider text-platinum">
                Regional workload distribution
              </h3>
              <div className="space-y-3">
                {(summary?.regionalDistribution || []).map((r: any) => (
                  <div key={r.region} className="flex items-center justify-between text-xs">
                    <span className="text-silver">{r.region} region</span>
                    <span className="font-mono font-medium text-silver-bright bg-gunmetal px-2.5 py-1 rounded">
                      {r.count} applications
                    </span>
                  </div>
                ))}
              </div>
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
