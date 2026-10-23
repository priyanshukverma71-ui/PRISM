import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';

export function ApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const region = searchParams.get('region') || '';
  const stage = searchParams.get('stage') || '';
  const category = searchParams.get('category') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: '12',
    ...(search ? { search } : {}),
    ...(region ? { region } : {}),
    ...(stage ? { stage } : {}),
    ...(category ? { category } : {}),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['applications', queryParams.toString()],
    queryFn: () => apiRequest<any>(`/applications?${queryParams.toString()}`),
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (search) newParams.set('search', search);
    else newParams.delete('search');
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const getStageBadgeColor = (stg: string) => {
    switch (stg) {
      case 'APPROVED':
        return 'bg-status-success/15 text-status-success border-status-success/30';
      case 'REJECTED':
        return 'bg-status-critical/15 text-status-critical border-status-critical/30';
      case 'CLARIFICATION_REQUIRED':
        return 'bg-status-warning/15 text-status-warning border-status-warning/30';
      case 'EVC_PENDING':
      case 'EVC_SCHEDULED':
        return 'bg-cyan-950/50 text-cyan-300 border-cyan-800';
      case 'UNDER_SCRUTINY':
        return 'bg-blue-950/50 text-blue-300 border-blue-800';
      default:
        return 'bg-gunmetal text-silver border-graphite-border';
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-silver-bright tracking-tight">Institutional Applications</h2>
          <p className="text-xs text-slate-muted">Authorised case dossiers and statutory regulatory routing</p>
        </div>
        <Link
          to="/applications/new"
          className="platinum-button-primary px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 self-start"
        >
          <Plus size={15} />
          <span>Submit New Application</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="platinum-card p-4 rounded-xl border border-graphite-border flex flex-wrap gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-muted" />
          <input
            type="text"
            placeholder="Search by Application Number or Institution Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-obsidian border border-graphite-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-silver placeholder-slate-muted focus:outline-none focus:border-platinum"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Region filter */}
          <select
            value={region}
            onChange={(e) => updateFilter('region', e.target.value)}
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none"
          >
            <option value="">All Regions</option>
            <option value="Western">Western</option>
            <option value="Northern">Northern</option>
            <option value="Southern">Southern</option>
            <option value="Eastern">Eastern</option>
            <option value="South-Western">South-Western</option>
            <option value="Central">Central</option>
          </select>

          {/* Stage filter */}
          <select
            value={stage}
            onChange={(e) => updateFilter('stage', e.target.value)}
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none"
          >
            <option value="">All Processing Stages</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_SCRUTINY">Under Scrutiny</option>
            <option value="CLARIFICATION_REQUIRED">Clarification Required</option>
            <option value="RESUBMITTED">Resubmitted</option>
            <option value="EVC_PENDING">EVC Pending</option>
            <option value="EVC_SCHEDULED">EVC Scheduled</option>
            <option value="EVC_COMPLETED">EVC Completed</option>
            <option value="COMMITTEE_REVIEW">Committee Review</option>
            <option value="AWAITING_DECISION">Awaiting Decision</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Category filter */}
          <select
            value={category}
            onChange={(e) => updateFilter('category', e.target.value)}
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="EXTENSION_OF_APPROVAL">Extension of Approval</option>
            <option value="NEW_INSTITUTION">New Institution</option>
            <option value="INTAKE_INCREASE">Intake Increase</option>
            <option value="NEW_COURSE">New Course</option>
          </select>
        </div>
      </div>

      {/* Applications Data Table */}
      <div className="platinum-card rounded-xl border border-graphite-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-muted font-mono text-xs">Loading application dossiers...</div>
        ) : !data || data.length === 0 ? (
          <div className="p-12 text-center text-slate-muted">
            <Layers size={32} className="mx-auto mb-2 text-gunmetal-light" />
            <p className="text-sm font-medium text-silver">No applications matched the specified filters</p>
            <p className="text-xs text-slate-muted mt-1">Try resetting search criteria or create a new case</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-graphite-border bg-graphite/40 text-slate-muted font-mono uppercase text-[10px]">
                  <th className="py-3 px-4">Application ID</th>
                  <th className="py-3 px-4">Institution Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4">Deadline SLA</th>
                  <th className="py-3 px-4">Risk Rating</th>
                  <th className="py-3 px-4 text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-border">
                {data.map((app: any) => (
                  <tr key={app.id} className="hover:bg-graphite-hover transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-silver-bright">
                      <Link to={`/applications/${app.id}`} className="hover:text-platinum">
                        {app.applicationNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-silver truncate max-w-xs">{app.institution.name}</p>
                      <span className="text-[10px] font-mono text-slate-muted">
                        {app.institution.code} • {app.region} Region
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-muted">
                      {(app.category || '').replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${getStageBadgeColor(app.currentStage)}`}>
                        {(app.currentStage || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {app.deadlineDate ? (
                        <span className={new Date(app.deadlineDate) < new Date() ? 'text-status-critical font-bold' : 'text-slate-muted'}>
                          {new Date(app.deadlineDate).toISOString().split('T')[0]}
                        </span>
                      ) : (
                        <span className="text-slate-muted">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          app.riskCategory === 'CRITICAL'
                            ? 'bg-status-critical/20 text-status-critical border-status-critical/40'
                            : app.riskCategory === 'HIGH'
                            ? 'bg-status-warning/20 text-status-warning border-status-warning/40'
                            : 'bg-gunmetal text-silver border-graphite-border'
                        }`}
                      >
                        {app.riskScore} [{app.riskCategory}]
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/applications/${app.id}`}
                        className="platinum-button-secondary py-1 px-2.5 rounded text-[11px] font-mono inline-flex items-center gap-1"
                      >
                        <span>Open</span>
                        <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
export default ApplicationsPage;
