import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Clock,
  ArrowRight,
  CheckCircle2,
  Building,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { formatDaysRemaining, formatPlainStage, formatCategory } from '../lib/plainLanguage.js';

export function DeadlinesPage() {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL_7_DAYS' | 'EXPIRING_30_DAYS' | 'OVERDUE'>('ALL');

  // 1. Expiring documents
  const { data: documents, isLoading: isDocsLoading } = useQuery({
    queryKey: ['deadlines-docs'],
    queryFn: () => apiRequest<any[]>('/documents'),
  });

  // 2. EVC visits with scheduling deadlines
  const { data: evcVisits, isLoading: isEvcLoading } = useQuery({
    queryKey: ['deadlines-evc'],
    queryFn: () => apiRequest<any[]>('/evc?status=PENDING_SCHEDULE'),
  });

  // 3. Applications approaching deadlines
  const { data: applications, isLoading: isAppsLoading } = useQuery({
    queryKey: ['deadlines-apps'],
    queryFn: () => apiRequest<any[]>('/applications'),
  });

  if (isDocsLoading || isEvcLoading || isAppsLoading) {
    return (
      <div className="p-12 text-center text-slate-muted font-mono text-xs">
        <span className="w-2.5 h-2.5 rounded-full bg-platinum animate-ping inline-block mr-2" />
        Calculating deadlines and expirations...
      </div>
    );
  }

  const now = Date.now();

  // Consolidate all deadline items
  interface DeadlineItem {
    id: string;
    type: 'DOCUMENT_EXPIRY' | 'EVC_CUTOFF' | 'STAGE_DETERMINATION';
    title: string;
    institution: string;
    targetDate: string;
    daysRemaining: number;
    category: string;
    actionUrl: string;
    actionLabel: string;
  }

  const allDeadlines: DeadlineItem[] = [];

  // Add document expirations
  (documents || []).forEach((doc: any) => {
    if (doc.expiryDate) {
      const diff = Math.ceil((new Date(doc.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24));
      allDeadlines.push({
        id: `doc-${doc.id}`,
        type: 'DOCUMENT_EXPIRY',
        title: doc.title,
        institution: doc.institution?.name || 'Institution',
        targetDate: doc.expiryDate,
        daysRemaining: diff,
        category: formatCategory(doc.category),
        actionUrl: '/documents',
        actionLabel: 'Upload document',
      });
    }
  });

  // Add EVC scheduling deadlines
  (evcVisits || []).forEach((evc: any) => {
    if (evc.schedulingDeadline) {
      const diff = Math.ceil((new Date(evc.schedulingDeadline).getTime() - now) / (1000 * 60 * 60 * 24));
      allDeadlines.push({
        id: `evc-${evc.id}`,
        type: 'EVC_CUTOFF',
        title: `Appoint expert inspection committee`,
        institution: evc.application?.institution?.name || 'Institution',
        targetDate: evc.schedulingDeadline,
        daysRemaining: diff,
        category: 'Inspection window',
        actionUrl: '/evc',
        actionLabel: 'Schedule inspection',
      });
    }
  });

  // Add application stage determination deadlines
  (applications || []).forEach((app: any) => {
    if (app.deadlineDate && app.status !== 'APPROVED' && app.status !== 'REJECTED' && app.status !== 'CLOSED') {
      const diff = Math.ceil((new Date(app.deadlineDate).getTime() - now) / (1000 * 60 * 60 * 24));
      const isUrgent = diff <= 3;
      allDeadlines.push({
        id: `app-${app.id}`,
        type: 'STAGE_DETERMINATION',
        title: isUrgent
          ? 'This application may miss its deadline. Review the pending verification.'
          : `${formatPlainStage(app.currentStage)} review deadline`,
        institution: app.institution?.name || 'Institution',
        targetDate: app.deadlineDate,
        daysRemaining: diff,
        category: `Dossier #${app.applicationNumber}`,
        actionUrl: `/applications/${app.id}`,
        actionLabel: 'Review pending verification',
      });
    }
  });

  // Sort by days remaining (most urgent first)
  allDeadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);

  // Filter
  const filtered = allDeadlines.filter((item) => {
    if (filter === 'OVERDUE') return item.daysRemaining < 0;
    if (filter === 'CRITICAL_7_DAYS') return item.daysRemaining >= 0 && item.daysRemaining <= 7;
    if (filter === 'EXPIRING_30_DAYS') return item.daysRemaining > 7 && item.daysRemaining <= 30;
    return true;
  });

  const overdueCount = allDeadlines.filter((i) => i.daysRemaining < 0).length;
  const criticalCount = allDeadlines.filter((i) => i.daysRemaining >= 0 && i.daysRemaining <= 7).length;
  const upcomingCount = allDeadlines.filter((i) => i.daysRemaining > 7 && i.daysRemaining <= 30).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-graphite-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-silver-bright tracking-tight">Deadlines</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-status-warning/15 text-status-warning border border-status-warning/30">
              Time-sensitive radar
            </span>
          </div>
          <p className="text-xs text-slate-muted mt-0.5">
            Monitor approaching statutory expirations, inspection windows, and regulatory cutoffs
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 bg-graphite p-1 rounded-xl border border-graphite-border self-start sm:self-auto">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === 'ALL'
                ? 'bg-platinum text-obsidian font-semibold'
                : 'text-slate-muted hover:text-silver'
            }`}
          >
            All ({allDeadlines.length})
          </button>
          <button
            onClick={() => setFilter('CRITICAL_7_DAYS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === 'CRITICAL_7_DAYS'
                ? 'bg-status-warning text-obsidian font-semibold'
                : 'text-slate-muted hover:text-status-warning'
            }`}
          >
            &lt; 7 days ({criticalCount})
          </button>
          <button
            onClick={() => setFilter('EXPIRING_30_DAYS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === 'EXPIRING_30_DAYS'
                ? 'bg-platinum text-obsidian font-semibold'
                : 'text-slate-muted hover:text-silver'
            }`}
          >
            &lt; 30 days ({upcomingCount})
          </button>
          <button
            onClick={() => setFilter('OVERDUE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === 'OVERDUE'
                ? 'bg-status-critical text-white font-semibold'
                : 'text-slate-muted hover:text-status-critical'
            }`}
          >
            Overdue ({overdueCount})
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="platinum-card p-3 rounded-xl border border-graphite-border">
          <span className="text-[10px] uppercase text-slate-muted block">Total deadlines</span>
          <span className="text-xl font-bold font-mono text-silver-bright tabular-nums">{allDeadlines.length}</span>
        </div>
        <div className="platinum-card p-3 rounded-xl border border-status-critical/30 bg-status-critical/5">
          <span className="text-[10px] uppercase text-status-critical block font-semibold">Overdue</span>
          <span className="text-xl font-bold font-mono text-status-critical tabular-nums">{overdueCount}</span>
        </div>
        <div className="platinum-card p-3 rounded-xl border border-status-warning/30 bg-status-warning/5">
          <span className="text-[10px] uppercase text-status-warning block font-semibold">Due in &lt; 7 days</span>
          <span className="text-xl font-bold font-mono text-status-warning tabular-nums">{criticalCount}</span>
        </div>
        <div className="platinum-card p-3 rounded-xl border border-graphite-border bg-graphite/40">
          <span className="text-[10px] uppercase text-platinum block font-semibold">Upcoming in &lt; 30 days</span>
          <span className="text-xl font-bold font-mono text-silver-bright tabular-nums">{upcomingCount}</span>
        </div>
      </div>

      {/* Deadlines List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="platinum-card p-12 text-center rounded-2xl border border-graphite-border space-y-2">
            <CheckCircle2 size={28} className="mx-auto text-status-success" />
            <p className="text-sm font-semibold text-silver">No deadlines found in this category</p>
            <p className="text-xs text-slate-muted">All regulatory deadlines in this bracket have been addressed.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const timing = formatDaysRemaining(item.targetDate);
            const isOverdue = timing.isOverdue;
            const isAtRisk = timing.isAtRisk;

            const nextActionText = (() => {
              if (item.type === 'DOCUMENT_EXPIRY') {
                return 'Next action: Upload the missing evidence / renewed statutory certificate';
              }
              if (item.type === 'EVC_CUTOFF') {
                return 'Next action: Appoint 3-member expert inspection panel and issue visit schedule';
              }
              return 'Next action: Review the pending verification and record observations before deadline cutoff';
            })();

            return (
              <div
                key={item.id}
                className={`platinum-card p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  isOverdue
                    ? 'border-status-critical/40 bg-status-critical/5'
                    : isAtRisk
                    ? 'border-status-warning/40 bg-status-warning/5'
                    : 'border-graphite-border hover:border-platinum/40'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        isOverdue
                          ? 'bg-status-critical/20 text-status-critical border-status-critical/40'
                          : isAtRisk
                          ? 'bg-status-warning/20 text-status-warning border-status-warning/40'
                          : 'bg-gunmetal text-platinum border-graphite-border'
                      }`}
                    >
                      {timing.text}
                    </span>

                    <span className="text-[11px] text-slate-muted">
                      {item.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-silver-bright">{item.title}</h3>
                    <p className="text-xs text-slate-muted flex items-center gap-1.5 mt-0.5">
                      <Building size={12} className="text-platinum" />
                      <span>{item.institution}</span>
                      <span>•</span>
                      <span>Target date: {new Date(item.targetDate).toLocaleDateString()}</span>
                    </p>
                  </div>

                  {/* Plain Language Next Action */}
                  <div className="p-2 rounded bg-obsidian border border-graphite-border text-[11px] text-platinum">
                    {nextActionText}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <Link
                    to={item.actionUrl}
                    className="platinum-button-primary px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default DeadlinesPage;
