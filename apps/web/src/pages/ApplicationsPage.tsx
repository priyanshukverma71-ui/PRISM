import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { formatPlainStage, formatDaysRemaining, formatCategory, formatSeverity } from '../lib/plainLanguage.js';

export function ApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const region = searchParams.get('region') || '';
  const stage = searchParams.get('stage') || '';
  const category = searchParams.get('category') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: '20',
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
          <h1 className="text-xl font-bold text-silver-bright tracking-tight">Applications</h1>
          <p className="text-xs text-slate-muted">Authorised case dossiers and statutory regulatory routing</p>
        </div>
        <Link
          to="/applications/new"
          className="platinum-button-primary px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 self-start"
        >
          <Plus size={15} />
          <span>New application</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="platinum-card p-4 rounded-xl border border-graphite-border flex flex-wrap gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-muted" />
          <input
            type="text"
            placeholder="Search by application number or institution name..."
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

          {/* Stage filter */}
          <select
            value={stage}
            onChange={(e) => updateFilter('stage', e.target.value)}
            aria-label="Filter by processing stage"
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none cursor-pointer"
          >
            <option value="">All processing stages</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_SCRUTINY">Under review</option>
            <option value="CLARIFICATION_REQUIRED">Clarification needed</option>
            <option value="RESUBMITTED">Resubmitted</option>
            <option value="EVC_PENDING">Inspection pending</option>
            <option value="EVC_SCHEDULED">Inspection scheduled</option>
            <option value="EVC_COMPLETED">Inspection completed</option>
            <option value="COMMITTEE_REVIEW">Committee review</option>
            <option value="AWAITING_DECISION">Awaiting final decision</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Category filter */}
          <select
            value={category}
            onChange={(e) => updateFilter('category', e.target.value)}
            aria-label="Filter by category"
            className="bg-obsidian border border-graphite-border rounded-lg px-2.5 py-1.5 text-xs text-silver focus:outline-none cursor-pointer"
          >
            <option value="">All categories</option>
            <option value="EXTENSION_OF_APPROVAL">Extension of approval</option>
            <option value="NEW_INSTITUTION">New institution</option>
            <option value="INTAKE_INCREASE">Intake increase</option>
            <option value="NEW_COURSE">New course</option>
          </select>
        </div>
      </div>

      {/* Applications Data Table */}
      <div className="platinum-card rounded-xl border border-graphite-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-muted font-mono text-xs">Loading applications...</div>
        ) : !data || data.length === 0 ? (
          <div className="p-12 text-center text-slate-muted">
            <Layers size={32} className="mx-auto mb-2 text-gunmetal-light" />
            <p className="text-sm font-medium text-silver">No applications found. Try changing your filters.</p>
            <p className="text-xs text-slate-muted mt-1">Try resetting your search criteria or submit a new application.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-graphite-border bg-graphite/40 text-slate-muted font-medium text-[11px]">
                  <th className="py-3 px-4">Application number</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Current stage</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Risk rating</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-border">
                {data.map((app: any) => (
                  <tr key={app.id} className="hover:bg-graphite-hover transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-silver-bright">
                      <Link to={`/applications/${app.id}`} className="hover:text-platinum">
                        {app.applicationNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-silver truncate max-w-xs">{app.institution.name}</p>
                      <span className="text-[10px] text-slate-muted">
                        {app.institution.code} • {app.region} region
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-muted text-[11px]">
                      {formatCategory(app.category)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getStageBadgeColor(app.currentStage)}`}>
                        {formatPlainStage(app.currentStage)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px]">
                      {app.deadlineDate ? (
                        <span className={formatDaysRemaining(app.deadlineDate).isAtRisk ? 'text-status-warning font-medium' : 'text-slate-muted'}>
                          {formatDaysRemaining(app.deadlineDate).text}
                        </span>
                      ) : (
                        <span className="text-slate-muted">Not applicable</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          app.riskCategory === 'CRITICAL'
                            ? 'bg-status-critical/15 text-status-critical border-status-critical/30'
                            : app.riskCategory === 'HIGH'
                            ? 'bg-status-warning/15 text-status-warning border-status-warning/30'
                            : 'bg-gunmetal text-silver border-graphite-border'
                        }`}
                      >
                        {app.riskScore} • {formatSeverity(app.riskCategory)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/applications/${app.id}`}
                        className="platinum-button-secondary py-1 px-2.5 rounded text-xs font-medium inline-flex items-center gap-1"
                      >
                        <span>View application</span>
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
