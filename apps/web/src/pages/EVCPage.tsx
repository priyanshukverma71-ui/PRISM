import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Calendar,
  FileCheck,
  ArrowRight,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { formatStatus, formatCategory, safeFormatError } from '../lib/plainLanguage.js';
import { LoadingState } from '../components/common/LoadingState.js';
import { EmptyState } from '../components/common/EmptyState.js';

export function EVCPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  // Modals
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedEvc, setSelectedEvc] = useState<any>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [reschedulingReason, setReschedulingReason] = useState('');
  const [findingsModalOpen, setFindingsModalOpen] = useState(false);
  const [findingsText, setFindingsText] = useState('');

  const queryParams = new URLSearchParams({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(regionFilter ? { region: regionFilter } : {}),
  });

  const { data: evcVisits, isLoading } = useQuery({
    queryKey: ['evc-visits', queryParams.toString()],
    queryFn: () => apiRequest<any[]>(`/evc?${queryParams.toString()}`),
  });

  const scheduleMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      apiRequest(`/evc/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evc-visits'] });
      setScheduleModalOpen(false);
      setFindingsModalOpen(false);
      showToast({
        type: 'success',
        title: 'Inspection updated',
        message: 'The committee schedule and inspection status have been saved.',
      });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: "We couldn't save the inspection schedule",
        message: safeFormatError(err, 'Check that the committee members and date comply with handbook rules.'),
      });
    },
  });

  const handleOpenSchedule = (evc: any) => {
    setSelectedEvc(evc);
    setScheduledDate(
      evc.scheduledDate ? new Date(evc.scheduledDate).toISOString().split('T')[0] : ''
    );
    setReschedulingReason('');
    setScheduleModalOpen(true);
  };

  const handleOpenFindings = (evc: any) => {
    setSelectedEvc(evc);
    setFindingsText(evc.findings || '');
    setFindingsModalOpen(true);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvc || !scheduledDate) return;

    const isReschedule = selectedEvc.status === 'SCHEDULED';
    if (isReschedule && !reschedulingReason) {
      showToast({
        type: 'warning',
        title: 'Reason required',
        message: 'A formal reason is required when rescheduling an inspection committee.',
      });
      return;
    }

    scheduleMutation.mutate({
      id: selectedEvc.id,
      body: {
        status: 'SCHEDULED',
        scheduledDate,
        ...(isReschedule ? { reschedulingReason } : {}),
      },
    });
  };

  const handleFindingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvc || !findingsText) return;

    scheduleMutation.mutate({
      id: selectedEvc.id,
      body: {
        status: 'COMPLETED',
        findings: findingsText,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-silver-bright tracking-tight">Expert inspection workspace</h1>
          <p className="text-xs text-slate-muted">Physical and virtual inspection scheduling, committee constitution, and findings submission</p>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="platinum-card p-4 rounded-xl border border-graphite-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by visit status"
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none cursor-pointer"
          >
            <option value="">All visit statuses</option>
            <option value="PENDING_SCHEDULE">Pending schedule</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            aria-label="Filter by region"
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none cursor-pointer"
          >
            <option value="">All regions</option>
            <option value="Western">Western</option>
            <option value="Northern">Northern</option>
            <option value="Southern">Southern</option>
            <option value="Eastern">Eastern</option>
            <option value="South-Western">South-Western</option>
            <option value="Central">Central</option>
          </select>
        </div>

        <span className="text-xs text-slate-muted">
          Tracking {evcVisits?.length || 0} inspection records
        </span>
      </div>

      {/* EVC Visits Cards & Table */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <LoadingState message="Loading inspection registers..." subtext="Retrieving committee schedules and campus review rosters..." rows={3} />
        ) : (evcVisits || []).length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No inspection visits found"
            description="There are currently no inspection committee visits matching your active filter criteria."
          />
        ) : (
          evcVisits!.map((evc: any) => (
            <div
              key={evc.id}
              className="platinum-card p-5 rounded-xl border border-graphite-border flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-sm text-silver-bright">
                    {evc.application.applicationNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                      evc.status === 'COMPLETED'
                        ? 'bg-status-success/15 text-status-success border-status-success/30'
                        : evc.status === 'SCHEDULED'
                        ? 'bg-blue-950/50 text-blue-300 border-blue-800'
                        : 'bg-status-warning/15 text-status-warning border-status-warning/30'
                    }`}
                  >
                    {formatStatus(evc.status)}
                  </span>
                  <span className="text-[10px] text-slate-muted">
                    {formatCategory(evc.visitType)} visit • {evc.application.region} region
                  </span>
                </div>

                <p className="text-xs font-medium text-silver">
                  {evc.application.institution.name} ({evc.application.institution.code})
                </p>

                {/* Prerequisite satisfaction status */}
                <div className="flex items-center gap-4 text-[11px] pt-1">
                  <span>
                    Prerequisites:{' '}
                    <span className={evc.prerequisitesSatisfied ? 'text-status-success font-medium' : 'text-status-critical font-medium'}>
                      {evc.prerequisitesSatisfied ? 'Satisfied' : 'Pending review clarification'}
                    </span>
                  </span>

                  {evc.schedulingDeadline && (
                    <span className="text-slate-muted">
                      Deadline: {new Date(evc.schedulingDeadline).toISOString().split('T')[0]}
                    </span>
                  )}
                </div>

                {evc.findings && (
                  <p className="text-xs text-slate-muted italic mt-1 line-clamp-2">
                    Findings: "{evc.findings}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start md:self-center">
                {evc.status !== 'COMPLETED' && (
                  <button
                    onClick={() => handleOpenSchedule(evc)}
                    className="platinum-button-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CalendarCheck size={14} />
                    <span>{evc.status === 'SCHEDULED' ? 'Reschedule date' : 'Schedule inspection'}</span>
                  </button>
                )}

                {evc.status === 'SCHEDULED' && (
                  <button
                    onClick={() => handleOpenFindings(evc)}
                    className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-status-success border-status-success/40 cursor-pointer"
                  >
                    <FileCheck size={14} />
                    <span>Submit findings</span>
                  </button>
                )}

                <Link
                  to={`/applications/${evc.applicationId}`}
                  className="platinum-button-secondary p-1.5 rounded-lg text-slate-muted hover:text-silver"
                  title="View application"
                  aria-label="View application"
                >
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Modal */}
      {scheduleModalOpen && selectedEvc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="platinum-card max-w-md w-full p-6 rounded-2xl border border-graphite-border space-y-4">
            <h3 className="text-sm font-bold text-silver-bright">
              {selectedEvc.status === 'SCHEDULED' ? 'Reschedule inspection' : 'Schedule expert inspection'}
            </h3>
            <p className="text-xs text-slate-muted">
              {selectedEvc.application?.institution?.name} ({selectedEvc.application?.applicationNumber})
            </p>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-platinum mb-1">Inspection date *</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                  required
                />
              </div>

              {selectedEvc.status === 'SCHEDULED' && (
                <div>
                  <label className="block text-xs font-medium text-platinum mb-1">Rescheduling explanation *</label>
                  <textarea
                    value={reschedulingReason}
                    onChange={(e) => setReschedulingReason(e.target.value)}
                    rows={3}
                    placeholder="Provide reason for changing the scheduled inspection date..."
                    className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleMutation.isPending}
                  className="platinum-button-primary px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {scheduleMutation.isPending ? 'Saving...' : 'Confirm schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Findings Modal */}
      {findingsModalOpen && selectedEvc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="platinum-card max-w-md w-full p-6 rounded-2xl border border-graphite-border space-y-4">
            <h3 className="text-sm font-bold text-silver-bright">Submit inspection findings</h3>
            <p className="text-xs text-slate-muted">
              {selectedEvc.application?.institution?.name} ({selectedEvc.application?.applicationNumber})
            </p>

            <form onSubmit={handleFindingsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-platinum mb-1">Committee findings &amp; recommendation *</label>
                <textarea
                  value={findingsText}
                  onChange={(e) => setFindingsText(e.target.value)}
                  rows={4}
                  placeholder="Record verification of physical facilities, faculty records, and compliance..."
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFindingsModalOpen(false)}
                  className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleMutation.isPending}
                  className="platinum-button-primary px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {scheduleMutation.isPending ? 'Saving...' : 'Submit findings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EVCPage;
