import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
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
import { MinimalTaskView } from '../components/dashboard/MinimalTaskView.js';
import { ErrorBoundary } from '../components/common/ErrorBoundary.js';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const urlView = searchParams.get('view');
  const [viewMode, setViewMode] = useState<'3D_HOLODECK' | 'TASK_FIRST' | 'ANALYTICS'>(() => {
    if (urlView === 'TASK_FIRST' || urlView === 'ANALYTICS' || urlView === '3D_HOLODECK') {
      return urlView;
    }
    return '3D_HOLODECK'; // Default opener page is 3D Spatial Holodeck
  });
  const [selectedCase, setSelectedCase] = useState<SpatialCaseNode | null>(null);
  const [temporalOffset, setTemporalOffset] = useState<number>(0);
  const [activeIntervention, setActiveIntervention] = useState<'NONE' | 'FAST_TRACK_EVC' | 'SPECIAL_SCRUTINY_DRIVE' | 'PROVISIONAL_UNDERTAKING'>('NONE');
  const [showSecondaryAnalytics, setShowSecondaryAnalytics] = useState<boolean>(false);

  // Sync state if URL search query changes
  useEffect(() => {
    if (urlView === 'TASK_FIRST' || urlView === 'ANALYTICS' || urlView === '3D_HOLODECK') {
      setViewMode(urlView);
    }
  }, [urlView]);

  const handleViewModeChange = (mode: '3D_HOLODECK' | 'TASK_FIRST' | 'ANALYTICS') => {
    setViewMode(mode);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (mode === '3D_HOLODECK') {
        next.delete('view');
      } else {
        next.set('view', mode);
      }
      return next;
    }, { replace: true });
  };

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
    count: Number(count) || 0,
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
                  {viewMode === '3D_HOLODECK' ? '3D Holodeck' : viewMode === 'TASK_FIRST' ? 'Task view' : 'Analytics'}
                </span>
              </div>
              <p className="text-xs text-slate-muted">
                {user?.name ? `${user.name} • ${formatRole(user.role)}` : 'Regulatory status and operational tasks'}
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Selector: 3D Holodeck vs Task-First vs Analytics */}
        <div className="flex items-center gap-1.5 liquid-glass-capsule p-1.5 rounded-2xl self-start md:self-auto shadow-xl">
          <button
            onClick={() => handleViewModeChange('3D_HOLODECK')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === '3D_HOLODECK'
                ? 'liquid-glass-pill-active font-semibold'
                : 'liquid-glass-pill text-slate-muted hover:text-silver'
            }`}
          >
            <Globe size={14} className={viewMode === '3D_HOLODECK' ? 'text-obsidian' : 'text-[#F5BA42]'} />
            <span>3D Holodeck</span>
          </button>

          <button
            onClick={() => handleViewModeChange('TASK_FIRST')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'TASK_FIRST'
                ? 'liquid-glass-pill-active font-semibold'
                : 'liquid-glass-pill text-slate-muted hover:text-silver'
            }`}
          >
            <ListTodo size={14} className={viewMode === 'TASK_FIRST' ? 'text-obsidian' : 'text-[#F5BA42]'} />
            <span>Task view</span>
          </button>

          <button
            onClick={() => handleViewModeChange('ANALYTICS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'ANALYTICS'
                ? 'liquid-glass-pill-active font-semibold'
                : 'liquid-glass-pill text-slate-muted hover:text-silver'
            }`}
          >
            <BarChart3 size={14} className={viewMode === 'ANALYTICS' ? 'text-obsidian' : 'text-[#F5BA42]'} />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* Meaningful Metrics Strip (rendered in 3D Holodeck & Analytics views) */}
      {viewMode !== 'TASK_FIRST' && (
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
      )}

      {/* ============================================================== */}
      {/* 1. PRIMARY TASK-FIRST VIEW (MINIMALIST 4-SLAB MATTE LAYOUT)    */}
      {/* ============================================================== */}
      {viewMode === 'TASK_FIRST' && (
        <MinimalTaskView
          user={user}
          summary={summary}
          applications={applications || []}
          urgentObligations={urgentObligations}
          returnedApplications={returnedApplications}
          criticalAlerts={criticalAlerts}
          expiringDocs={expiringDocs}
          pendingEvc={pendingEvc}
          applicationsApproachingCutoff={applicationsApproachingCutoff}
          roleNextActions={roleNextActions}
          waitingApplications={waitingApplications}
          recentEvents={recentEvents}
          totalAttentionCount={totalAttentionCount}
          totalDueSoonCount={totalDueSoonCount}
          stageChartData={stageChartData}
        />
      )}

      {/* ============================================================== */}
      {/* 2. 3D SPATIAL HOLODECK VIEW (INTERACTIVE 4D SIMULATION)         */}
      {/* ============================================================== */}
      {viewMode === '3D_HOLODECK' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-muted bg-gunmetal/40 px-3.5 py-2 rounded-xl border border-graphite-border">
            <span>Spatial orbital nodes represent active institutional applications. Drag to rotate, scroll to zoom.</span>
            <span className="text-platinum font-medium">Click any node to open case dossier</span>
          </div>

          <div className="h-[580px] w-full relative isolate z-0 rounded-2xl overflow-hidden border border-graphite-border shadow-2xl">
            <ErrorBoundary
              fallbackTitle="3D Graphics Acceleration Unavailable"
              fallbackMessage="Your browser or device does not currently have WebGL hardware acceleration enabled. Switch to Task view or Analytics above to view your applications."
            >
              <SpatialHolodeck
                cases={spatialNodes}
                onSelectCase={(c) => setSelectedCase(c)}
                selectedCaseId={selectedCase?.id}
                temporalOffsetDays={temporalOffset}
                activeIntervention={activeIntervention}
              />
            </ErrorBoundary>
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
