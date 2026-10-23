import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  FileCheck,
  FileText,
  Flame,
  Globe,
  Layers,
  ListTodo,
  Shield,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  formatPlainStage,
  formatDaysRemaining,
  formatPlainComplianceStatus,
  formatPlainAlert,
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
        <span>Loading AICTE PRISM Task Command Center...</span>
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
  const expiringDocs = (expiringDocsData || []).slice(0, 5);
  const pendingEvc = (pendingEvcData || []).slice(0, 4);
  const applicationsApproachingCutoff = (applications || [])
    .filter((a: any) => {
      if (!a.deadlineDate) return false;
      const diffDays = Math.ceil((new Date(a.deadlineDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 14;
    })
    .slice(0, 4);

  const totalDueSoonCount =
    expiringDocs.length + pendingEvc.length + applicationsApproachingCutoff.length;

  // --- QUESTION 3: WHAT SHOULD I DO NEXT? (Role-Specific Guided Decision Queue) ---
  const isOfficer = user?.role === 'REGIONAL_OFFICER' || user?.role === 'BUREAU_OFFICER';
  const isInstitution = user?.role === 'INSTITUTION_USER';
  const isAdmin = user?.role === 'SYSTEM_ADMIN' || user?.role === 'AUDITOR';

  const roleNextActions = (() => {
    if (isOfficer) {
      return [
        {
          id: 'scrutiny-priority',
          priority: 'PRIORITY 1',
          urgencyColor: 'text-platinum border-platinum/40 bg-platinum/10',
          title: 'Complete Scrutiny Assessment for VJTI',
          subtitle: 'APP-2025-WRO-0491 • Extension of Approval',
          reason: 'All technical and financial records are indexed. Record regulatory determination to prevent stage breach.',
          ctaLabel: 'Execute Scrutiny',
          to: '/applications',
          badge: 'UNDER_SCRUTINY',
        },
        {
          id: 'evc-appointment',
          priority: 'PRIORITY 2',
          urgencyColor: 'text-status-warning border-status-warning/40 bg-status-warning/10',
          title: 'Constitute 3-Member EVC Inspection Team',
          subtitle: 'APP-2025-NRO-1104 • Delhi Inst. of Advanced Architecture',
          reason: 'Initial scrutiny cleared. Assign expert committee lead before statutory 5-day dispatch deadline.',
          ctaLabel: 'Assign Committee',
          to: '/evc',
          badge: 'EVC_PENDING',
        },
        {
          id: 'deficiency-verification',
          priority: 'PRIORITY 3',
          urgencyColor: 'text-slate-muted border-slate-muted/40 bg-gunmetal',
          title: 'Verify Land Lease Undertaking Resubmission',
          subtitle: 'OBL-WRO-2025-01 • Institutional Compliance Evidence',
          reason: 'Institution uploaded renewed registered municipal lease deed. Mark verified or issue deficiency.',
          ctaLabel: 'Review Evidence',
          to: '/compliance',
          badge: 'SUBMITTED',
        },
      ];
    }

    if (isInstitution) {
      return [
        {
          id: 'clarification-response',
          priority: 'PRIORITY 1',
          urgencyColor: 'text-status-critical border-status-critical/40 bg-status-critical/10',
          title: 'Respond to Regional Officer Deficiency Notice',
          subtitle: 'APP-2025-WRO-0491 • Clarification Required',
          reason: 'Regional office noted missing registered building occupancy certificate. Upload proof within 7 days.',
          ctaLabel: 'Upload Evidence',
          to: '/compliance',
          badge: 'DEFICIENCY',
        },
        {
          id: 'doc-renewal',
          priority: 'PRIORITY 2',
          urgencyColor: 'text-status-warning border-status-warning/40 bg-status-warning/10',
          title: 'Renew Statutory Municipal Fire Safety NOC',
          subtitle: 'Current certificate expires in 8 calendar days',
          reason: 'AICTE mandate requires unexpired Fire NOC for active approved status. Request fire audit extension.',
          ctaLabel: 'Renew Document',
          to: '/documents',
          badge: 'EXPIRING_SOON',
        },
        {
          id: 'evc-readiness',
          priority: 'PRIORITY 3',
          urgencyColor: 'text-slate-muted border-slate-muted/40 bg-gunmetal',
          title: 'Prepare Biometric Attendance & Lab Registers',
          subtitle: 'Mandatory on-site EVC Inspection Checklist',
          reason: 'Verify physical laboratory hardware and faculty service books prior to expert team arrival.',
          ctaLabel: 'View Checklist',
          to: '/evc',
          badge: 'PRE-EVC',
        },
      ];
    }

    // Default / System Administrator & Auditor
    return [
      {
        id: 'admin-intervention',
        priority: 'PRIORITY 1',
        urgencyColor: 'text-platinum border-platinum/40 bg-platinum/10',
        title: 'Apply Fast-Track Administrative Intervention',
        subtitle: '2 Applications in Western & Northern Zones near Bottleneck',
        reason: 'Provisional undertaking intervention will recover 14 days and prevent systemic statutory default.',
        ctaLabel: 'Launch 4D Chronos',
        action: () => {
          setViewMode('3D_HOLODECK');
          setActiveIntervention('FAST_TRACK_EVC');
        },
        badge: 'PREDICTIVE_HEALING',
      },
      {
        id: 'alert-resolution',
        priority: 'PRIORITY 2',
        urgencyColor: 'text-status-critical border-status-critical/40 bg-status-critical/10',
        title: 'Acknowledge Overdue Statutory Escalations',
        subtitle: '3 high-severity bottleneck warnings pending review',
        reason: 'Escalations have exceeded 48-hour response threshold without administrative acknowledgement.',
        ctaLabel: 'Resolve Alerts',
        to: '/alerts',
        badge: 'ESCALATED',
      },
      {
        id: 'regional-balance',
        priority: 'PRIORITY 3',
        urgencyColor: 'text-slate-muted border-slate-muted/40 bg-gunmetal',
        title: 'Rebalance Regional Officer Scrutiny Caseloads',
        subtitle: 'Western Region at 38% capacity vs Southern at 12%',
        reason: 'Reallocate pending scrutiny dossiers to maintain uniform 7-day average turnaround SLA.',
        ctaLabel: 'View Risk Radar',
        to: '/risk-radar',
        badge: 'REBALANCE',
      },
    ];
  })();

  const stageChartData = Object.entries(summary?.stageBreakdown || {}).map(([stage, count]) => ({
    stage: (stage || '').replace(/_/g, ' '),
    count,
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-graphite-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gunmetal border border-platinum/40 flex items-center justify-center shadow-platinum">
              <span className="font-mono font-black text-silver-bright text-base">Δ</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-silver-bright tracking-tight">PRISM Regulatory Command</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-platinum/15 text-platinum border border-platinum/30">
                  TASK-FIRST INTELLIGENCE
                </span>
              </div>
              <p className="text-xs text-slate-muted">
                {user?.name && user?.role
                  ? `${user.name} • ${String(user.role).replace(/_/g, ' ')}`
                  : user?.name || 'Approval & Compliance Intelligence'}
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Selector: Task-First vs 3D Holodeck vs Secondary Telemetry */}
        <div className="flex items-center gap-1.5 bg-graphite p-1 rounded-xl border border-graphite-border self-start md:self-auto">
          <button
            onClick={() => setViewMode('TASK_FIRST')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'TASK_FIRST'
                ? 'bg-platinum text-obsidian border border-white font-bold shadow-platinum'
                : 'text-slate-muted hover:text-silver'
            }`}
          >
            <ListTodo size={13} />
            <span>Task Command</span>
          </button>

          <button
            onClick={() => setViewMode('3D_HOLODECK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === '3D_HOLODECK'
                ? 'bg-platinum text-obsidian border border-white font-bold shadow-platinum'
                : 'text-slate-muted hover:text-silver'
            }`}
          >
            <Globe size={13} />
            <span>3D Holodeck</span>
          </button>

          <button
            onClick={() => setViewMode('ANALYTICS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'ANALYTICS'
                ? 'bg-platinum text-obsidian border border-white font-bold shadow-platinum'
                : 'text-slate-muted hover:text-silver'
            }`}
          >
            <BarChart3 size={13} />
            <span>Telemetry</span>
          </button>
        </div>
      </div>

      {/* Decision KPI Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="platinum-card p-3.5 rounded-xl border border-status-critical/30 bg-status-critical/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-status-critical font-bold flex items-center gap-1.5">
              <AlertCircle size={12} />
              Needs Attention
            </span>
            <span className="w-2 h-2 rounded-full bg-status-critical animate-pulse" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-status-critical tabular-nums">
              {totalAttentionCount}
            </span>
            <span className="text-xs text-slate-muted">critical blockers</span>
          </div>
        </div>

        <div className="platinum-card p-3.5 rounded-xl border border-status-warning/30 bg-status-warning/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-status-warning font-bold flex items-center gap-1.5">
              <Clock size={12} />
              Due Soon
            </span>
            <span className="text-[10px] font-mono text-status-warning">&lt; 14 days</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-status-warning tabular-nums">
              {totalDueSoonCount}
            </span>
            <span className="text-xs text-slate-muted">imminent deadlines</span>
          </div>
        </div>

        <div className="platinum-card p-3.5 rounded-xl border border-platinum/30 bg-gunmetal/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-platinum font-bold flex items-center gap-1.5">
              <Zap size={12} />
              Next Priority Tasks
            </span>
            <span className="text-[10px] font-mono text-platinum">Direct Action</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-silver-bright tabular-nums">
              {roleNextActions.length}
            </span>
            <span className="text-xs text-slate-muted">guided actions</span>
          </div>
        </div>

        <div className="platinum-card p-3.5 rounded-xl border border-status-success/30 bg-status-success/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-status-success font-bold flex items-center gap-1.5">
              <Shield size={12} />
              Compliance Health
            </span>
            <span className="text-[10px] font-mono text-status-success">Verifiable</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-status-success tabular-nums">94.2%</span>
            <span className="text-xs text-slate-muted">audit integrity</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. PRIMARY TASK-FIRST VIEW (THE THREE CORE DECISION QUESTIONS) */}
      {/* ============================================================== */}
      {viewMode === 'TASK_FIRST' && (
        <div className="space-y-6">
          {/* Three Questions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* -------------------------------------------------------- */}
            {/* COLUMN 1: WHAT NEEDS MY ATTENTION?                      */}
            {/* -------------------------------------------------------- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-status-critical/30 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-status-critical/15 text-status-critical flex items-center justify-center font-bold">
                    <ShieldAlert size={14} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-silver-bright">What needs my attention?</h2>
                    <p className="text-[11px] text-slate-muted">Urgent compliance defects &amp; blockers</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-status-critical/15 text-status-critical border border-status-critical/30">
                  {totalAttentionCount} Urgent
                </span>
              </div>

              {totalAttentionCount === 0 ? (
                <div className="platinum-card p-6 rounded-xl border border-graphite-border text-center space-y-2">
                  <CheckCircle2 size={24} className="mx-auto text-status-success" />
                  <p className="text-xs font-semibold text-silver">Zero Critical Blockers</p>
                  <p className="text-[11px] text-slate-muted">All statutory obligations and applications are within safe regulatory limits.</p>
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
                        className="platinum-card platinum-card-hover p-3.5 rounded-xl border border-status-critical/40 bg-status-critical/5 space-y-2 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${statusInfo.badgeStyle}`}>
                            {statusInfo.label}
                          </span>
                          <span className="text-[10px] font-mono text-status-critical font-semibold">
                            {timing.text}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-silver-bright">{obl.title}</h4>
                          <p className="text-[11px] text-slate-muted line-clamp-1 mt-0.5">
                            {obl.institution?.name} • Category: {String(obl.category).replace(/_/g, ' ')}
                          </p>
                        </div>

                        <div className="p-2 rounded bg-obsidian border border-graphite-border/70 text-[11px] font-mono text-platinum">
                          {statusInfo.nextAction}
                        </div>

                        <Link
                          to="/compliance"
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-status-critical hover:text-white transition-colors pt-1 border-t border-status-critical/20 w-full"
                        >
                          <span>Rectify / Submit Missing Evidence</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    );
                  })}

                  {/* Clarification Required Applications */}
                  {returnedApplications.map((app: any) => (
                    <div
                      key={app.id}
                      className="platinum-card platinum-card-hover p-3.5 rounded-xl border border-status-warning/40 bg-status-warning/5 space-y-2 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-warning/20 text-status-warning uppercase border border-status-warning/30">
                          Action Required — Clarification Needed
                        </span>
                        <span className="text-[10px] font-mono text-silver">{app.applicationNumber}</span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-silver-bright">{app.institution?.name}</h4>
                        <p className="text-[11px] text-slate-muted line-clamp-2 mt-0.5">
                          {app.returnReason || 'Scrutiny identified missing structural safety proof. Awaiting response.'}
                        </p>
                      </div>

                      <div className="p-2 rounded bg-obsidian border border-graphite-border/70 text-[11px] font-mono text-status-warning">
                        Next action: Upload requested clarification documents in case dossier
                      </div>

                      <Link
                        to={`/applications/${app.id}`}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-status-warning hover:text-white transition-colors pt-1 border-t border-status-warning/20 w-full"
                      >
                        <span>Open Application Dossier</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  ))}

                  {/* High Severity Alerts with 4-Part Structure */}
                  {criticalAlerts.slice(0, 3).map((al: any) => {
                    const alertAnatomy = formatPlainAlert(al);

                    return (
                      <div
                        key={al.id}
                        className="platinum-card platinum-card-hover p-3.5 rounded-xl border border-graphite-border space-y-2.5 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-gunmetal text-status-critical border border-status-critical/30">
                            {alertAnatomy.urgencyText}
                          </span>
                          <span className="text-[10px] font-mono text-slate-muted">
                            Tier {al.escalationLevel}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-silver-bright">{alertAnatomy.issue}</p>
                          <p className="text-[11px] text-slate-muted mt-1 leading-relaxed">
                            <span className="text-platinum font-semibold">Impact: </span>
                            {alertAnatomy.whyItMatters}
                          </p>
                        </div>

                        <div className="p-2 rounded bg-obsidian border border-graphite-border/70 text-[10px] font-mono text-slate-muted flex items-center justify-between">
                          <span className="truncate max-w-[200px]">Owner: {alertAnatomy.owner}</span>
                          <span className="text-platinum font-semibold">{alertAnatomy.actionLabel}</span>
                        </div>

                        <Link
                          to={alertAnatomy.actionUrl}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-platinum hover:text-white transition-colors w-full border-t border-graphite-border pt-1.5"
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
            {/* COLUMN 2: WHAT IS DUE SOON?                             */}
            {/* -------------------------------------------------------- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-status-warning/30 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-status-warning/15 text-status-warning flex items-center justify-center font-bold">
                    <Clock size={14} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-silver-bright">What is due soon?</h2>
                    <p className="text-[11px] text-slate-muted">Approaching milestones &amp; expirations</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-status-warning/15 text-status-warning border border-status-warning/30">
                  {totalDueSoonCount} Due Soon
                </span>
              </div>

              <div className="space-y-3">
                {/* Expiring Legal Documents */}
                {expiringDocs.map((doc: any) => {
                  const timing = formatDaysRemaining(doc.expiryDate);

                  return (
                    <div
                      key={doc.id}
                      className="platinum-card platinum-card-hover p-3.5 rounded-xl border border-graphite-border space-y-2.5 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          timing.isAtRisk
                            ? 'bg-status-warning/20 text-status-warning border-status-warning/40'
                            : 'bg-gunmetal text-silver border-graphite-border'
                        }`}>
                          {timing.text}
                        </span>
                        <span className="text-[10px] font-mono text-slate-muted">{String(doc.category).replace(/_/g, ' ')}</span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-silver-bright">{doc.title}</h4>
                        <p className="text-[11px] text-slate-muted line-clamp-1 mt-0.5">
                          {doc.institution?.name} • File: {doc.fileName}
                        </p>
                      </div>

                      <div className="p-2 rounded bg-obsidian border border-graphite-border/70 text-[11px] font-mono text-platinum">
                        Next action: Upload renewed municipal/legal certificate
                      </div>

                      <Link
                        to="/deadlines"
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-platinum hover:text-white transition-colors pt-1 border-t border-graphite-border w-full"
                      >
                        <span>Inspect Certificate &amp; Renew</span>
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
                      className="platinum-card platinum-card-hover p-3.5 rounded-xl border border-graphite-border space-y-2.5 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          timing.isAtRisk
                            ? 'bg-status-warning/20 text-status-warning border-status-warning/40'
                            : 'bg-platinum/15 text-platinum border-platinum/30'
                        }`}>
                          {timing.text}
                        </span>
                        <span className="text-[10px] font-mono text-slate-muted">
                          {evc.application?.region} Region
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-silver-bright">
                          {evc.application?.institution?.name}
                        </h4>
                        <p className="text-[11px] text-slate-muted line-clamp-1 mt-0.5">
                          App: {evc.application?.applicationNumber} • 3-Expert Team Required
                        </p>
                      </div>

                      <div className="p-2 rounded bg-obsidian border border-graphite-border/70 text-[11px] font-mono text-platinum">
                        Next action: Appoint committee lead and confirm physical inspection window
                      </div>

                      <Link
                        to="/evc"
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-platinum hover:text-white transition-colors pt-1 border-t border-graphite-border w-full"
                      >
                        <span>Form Committee &amp; Schedule Visit</span>
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
                      className="platinum-card platinum-card-hover p-3.5 rounded-xl border border-graphite-border space-y-2.5 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gunmetal text-silver border border-graphite-border">
                          {formatPlainStage(app.currentStage)}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-status-warning">
                          {timing.text}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-silver-bright truncate">
                          {app.institution?.name}
                        </p>
                        <p className="text-[11px] font-mono text-slate-muted">
                          Dossier #{app.applicationNumber}
                        </p>
                      </div>

                      <div className="p-2 rounded bg-obsidian border border-graphite-border/70 text-[11px] font-mono text-platinum">
                        Next action: Complete scrutiny determination before stage cutoff
                      </div>

                      <Link
                        to={`/applications/${app.id}`}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-platinum hover:text-white transition-colors border-t border-graphite-border pt-1.5 w-full"
                      >
                        <span>Prioritize Determination</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* -------------------------------------------------------- */}
            {/* COLUMN 3: WHAT SHOULD I DO NEXT?                        */}
            {/* -------------------------------------------------------- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-platinum/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-platinum/20 text-silver-bright flex items-center justify-center font-bold">
                    <Compass size={14} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-silver-bright">What should I do next?</h2>
                    <p className="text-[11px] text-slate-muted">Ranked decision queue for your role</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-platinum/15 text-platinum border border-platinum/30">
                  {roleNextActions.length} Actions
                </span>
              </div>

              <div className="space-y-3">
                {roleNextActions.map((action, idx) => {
                  const isTop = idx === 0;

                  return (
                    <div
                      key={action.id}
                      className={`platinum-card p-4 rounded-xl border transition-all space-y-3 ${
                        isTop
                          ? 'border-platinum bg-gradient-to-b from-gunmetal/70 to-obsidian shadow-platinum'
                          : 'border-graphite-border hover:border-platinum/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${action.urgencyColor}`}
                        >
                          {action.priority}
                        </span>
                        <span className="text-[10px] font-mono text-slate-muted">{action.badge}</span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-silver-bright">{action.title}</h4>
                        <p className="text-[11px] font-medium text-platinum mt-0.5">{action.subtitle}</p>
                        <p className="text-[11px] text-slate-muted mt-1 leading-relaxed">{action.reason}</p>
                      </div>

                      <div className="pt-2 border-t border-graphite-border/70 flex items-center justify-between">
                        {action.action ? (
                          <button
                            onClick={action.action}
                            className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                              isTop
                                ? 'platinum-button-primary'
                                : 'platinum-button-secondary'
                            }`}
                          >
                            <span>{action.ctaLabel}</span>
                            <ArrowRight size={13} />
                          </button>
                        ) : (
                          <Link
                            to={action.to!}
                            className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                              isTop
                                ? 'platinum-button-primary'
                                : 'platinum-button-secondary'
                            }`}
                          >
                            <span>{action.ctaLabel}</span>
                            <ArrowRight size={13} />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Secondary Analytics Drawer / Section (Collapsible) */}
          <div className="pt-4 border-t border-graphite-border">
            <button
              onClick={() => setShowSecondaryAnalytics(!showSecondaryAnalytics)}
              className="flex items-center justify-between w-full py-3 px-4 rounded-xl bg-graphite/40 border border-graphite-border hover:border-platinum/30 text-xs font-mono text-slate-muted hover:text-silver transition-all"
            >
              <span className="flex items-center gap-2">
                <BarChart3 size={14} className="text-platinum" />
                <span>Secondary Telemetry &amp; System Analytics (Caseload Stages, Regional Workload &amp; Ageing)</span>
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${showSecondaryAnalytics ? 'rotate-180' : ''}`}
              />
            </button>

            {showSecondaryAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 animate-in fade-in duration-300">
                <div className="platinum-card p-5 rounded-2xl border border-graphite-border space-y-4">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
                    Caseload by Processing Stage
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
                  <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
                    Regional Workload Balance
                  </h3>
                  <div className="space-y-3">
                    {(summary?.regionalDistribution || []).map((r: any) => (
                      <div key={r.region} className="flex items-center justify-between text-xs">
                        <span className="text-silver">{r.region} Region</span>
                        <span className="font-mono font-bold text-silver-bright bg-gunmetal px-2.5 py-1 rounded">
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
      {/* 2. 3D SPATIAL HOLODECK VIEW (SIGNATURE 4D CHRONOS INNOVATION)   */}
      {/* ============================================================== */}
      {viewMode === '3D_HOLODECK' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-xs font-mono text-slate-muted bg-gunmetal/40 px-3 py-2 rounded-xl border border-graphite-border">
            <span>Spatial orbital nodes represent active institutional applications. Drag to rotate, scroll to zoom.</span>
            <span className="text-platinum font-bold">Node Click: Open Slide-out Dossier</span>
          </div>

          <div className="h-[520px] w-full relative rounded-2xl overflow-hidden border border-graphite-border shadow-platinum">
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
                    <span className="text-silver">{r.region} Region</span>
                    <span className="font-mono font-bold text-silver-bright bg-gunmetal px-2.5 py-1 rounded">
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
