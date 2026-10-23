import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Calendar,
  Clock,
  AlertTriangle,
  UserCheck,
  FileCheck,
  Plus,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  Search,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';

export function EVCPage() {
  const { user } = useAuth();
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
    },
    onError: (err: any) => {
      alert(`Scheduling blocked: ${err.message}`);
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
      alert('A recorded reason is mandatory when rescheduling an appointed EVC visit.');
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
          <h2 className="text-xl font-bold text-silver-bright tracking-tight">Expert Visit Committee (EVC) Workspace</h2>
          <p className="text-xs text-slate-muted">Physical and virtual inspection scheduling, committee constitution, and findings submission</p>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="platinum-card p-4 rounded-xl border border-graphite-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none"
          >
            <option value="">All Visit Statuses</option>
            <option value="PENDING_SCHEDULE">Pending Schedule</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none"
          >
            <option value="">All Regions</option>
            <option value="Western">Western</option>
            <option value="Northern">Northern</option>
            <option value="Southern">Southern</option>
            <option value="Eastern">Eastern</option>
            <option value="South-Western">South-Western</option>
          </select>
        </div>

        <span className="text-xs font-mono text-slate-muted">
          Showing {evcVisits?.length || 0} Inspection Registers
        </span>
      </div>

      {/* EVC Visits Cards & Table */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="p-8 text-center text-slate-muted font-mono text-xs">Loading EVC inspection registers...</div>
        ) : (evcVisits || []).length === 0 ? (
          <div className="platinum-card p-12 text-center text-slate-muted rounded-xl border border-graphite-border">
            <Calendar size={32} className="mx-auto mb-2 text-gunmetal-light" />
            <p className="text-sm font-medium text-silver">No EVC visits match current filter</p>
          </div>
        ) : (
          evcVisits!.map((evc: any) => (
            <div
              key={evc.id}
              className="platinum-card p-5 rounded-xl border border-graphite-border flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-silver-bright">
                    {evc.application.applicationNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      evc.status === 'COMPLETED'
                        ? 'bg-status-success/15 text-status-success border-status-success/30'
                        : evc.status === 'SCHEDULED'
                        ? 'bg-blue-950/50 text-blue-300 border-blue-800'
                        : 'bg-status-warning/15 text-status-warning border-status-warning/30'
                    }`}
                  >
                    {evc.status}
                  </span>
                  <span className="text-[10px] font-mono text-slate-muted">
                    {evc.visitType} Visit • {evc.application.region} Region
                  </span>
                </div>

                <p className="text-xs font-medium text-silver">
                  {evc.application.institution.name} ({evc.application.institution.code})
                </p>

                {/* Prerequisite satisfaction status */}
                <div className="flex items-center gap-4 text-[11px] font-mono pt-1">
                  <span>
                    Prerequisites:{' '}
                    <span className={evc.prerequisitesSatisfied ? 'text-status-success font-bold' : 'text-status-critical font-bold'}>
                      {evc.prerequisitesSatisfied ? 'CERTIFIED SATISFIED' : 'BLOCKED BY SCRUTINY DEFICIENCIES'}
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
                    className="platinum-button-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <CalendarCheck size={14} />
                    <span>{evc.status === 'SCHEDULED' ? 'Reschedule Date' : 'Schedule Visit'}</span>
                  </button>
                )}

                {evc.status === 'SCHEDULED' && (
                  <button
                    onClick={() => handleOpenFindings(evc)}
                    className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-status-success border-status-success/40"
                  >
                    <FileCheck size={14} />
                    <span>Submit Findings</span>
                  </button>
                )}

                <Link
                  to={`/applications/${evc.applicationId}`}
                  className="platinum-button-secondary p-1.5 rounded-lg text-slate-muted hover:text-silver"
                  title="Open Dossier"
                >
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule EVC Visit Modal */}
      {scheduleModalOpen && selectedEvc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="platinum-card max-w-md w-full p-6 rounded-2xl border border-graphite-border space-y-4">
            <h3 className="text-sm font-bold text-silver-bright flex items-center gap-2">
              <CalendarCheck size={16} className="text-platinum" />
              <span>Schedule Expert Visit Committee (EVC)</span>
            </h3>
            <p className="text-xs text-slate-muted">
              {selectedEvc.application.institution.name} ({selectedEvc.application.applicationNumber})
            </p>

            {!selectedEvc.prerequisitesSatisfied && (
              <div className="p-3 rounded-lg bg-status-critical/15 border border-status-critical/40 text-status-critical text-xs space-y-1">
                <p className="font-bold font-mono">Prerequisite Hold Detected:</p>
                <p>Mandatory scrutiny prerequisites are not satisfied. Normal scheduling is blocked unless administrative override is enabled.</p>
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-platinum mb-1 font-mono">Proposed Inspection Date *</label>
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
                  <label className="block text-xs font-medium text-platinum mb-1 font-mono">
                    Mandatory Rescheduling Reason *
                  </label>
                  <textarea
                    value={reschedulingReason}
                    onChange={(e) => setReschedulingReason(e.target.value)}
                    rows={3}
                    placeholder="Provide justification per APH norms (e.g. Panel flight disruption, unforeseen local administrative holiday)..."
                    className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleMutation.isPending}
                  className="platinum-button-primary px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  {scheduleMutation.isPending ? 'Confirming...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Findings Submission Modal */}
      {findingsModalOpen && selectedEvc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="platinum-card max-w-lg w-full p-6 rounded-2xl border border-graphite-border space-y-4">
            <h3 className="text-sm font-bold text-silver-bright flex items-center gap-2">
              <FileCheck size={16} className="text-status-success" />
              <span>Record EVC Inspection Findings & Report Hash</span>
            </h3>
            <p className="text-xs text-slate-muted">
              Findings are cryptographically hashed and recorded into the immutable audit flight recorder.
            </p>

            <form onSubmit={handleFindingsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-platinum mb-1 font-mono">Inspection Findings & Lab Verification Notes *</label>
                <textarea
                  value={findingsText}
                  onChange={(e) => setFindingsText(e.target.value)}
                  rows={5}
                  placeholder="Record summary of physical laboratories, instructional area, fire safety devices, faculty presence, and student amenities verified on campus..."
                  className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFindingsModalOpen(false)}
                  className="platinum-button-secondary px-3 py-1.5 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleMutation.isPending || findingsText.length < 10}
                  className="platinum-button-primary px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {scheduleMutation.isPending ? 'Signing Findings...' : 'Submit & Sign Report'}
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
