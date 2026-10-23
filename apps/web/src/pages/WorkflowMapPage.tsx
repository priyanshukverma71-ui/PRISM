import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { formatCategory, formatRole } from '../lib/plainLanguage.js';

interface WorkflowNode {
  id: string;
  name: string;
  category: string;
  slaDays: number;
  roles: string[];
  prerequisites: string[];
  description: string;
}

const STAGES_GRAPH: WorkflowNode[] = [
  {
    id: 'DRAFT',
    name: 'Draft application',
    category: 'Preparation',
    slaDays: 30,
    roles: ['INSTITUTION_USER'],
    prerequisites: ['Basic institutional profile'],
    description: 'Institution prepares application details, courses, and infrastructure documentation.',
  },
  {
    id: 'SUBMITTED',
    name: 'Transmitted to regional office',
    category: 'Preparation',
    slaDays: 3,
    roles: ['INSTITUTION_USER', 'REGIONAL_OFFICER'],
    prerequisites: ['Statutory processing fee', 'Affidavit upload'],
    description: 'Case logged into regional intake queue; pending allocation to review panel.',
  },
  {
    id: 'UNDER_SCRUTINY',
    name: 'Regional review committee',
    category: 'Review',
    slaDays: 7,
    roles: ['REGIONAL_OFFICER'],
    prerequisites: ['Land ownership & 30-year lease', 'Approved building plan', 'Fire safety certificate'],
    description: 'Comprehensive review of land encumbrance, building certificates, and faculty norms.',
  },
  {
    id: 'CLARIFICATION_REQUIRED',
    name: 'Deficiency clarification',
    category: 'Review',
    slaDays: 5,
    roles: ['REGIONAL_OFFICER', 'INSTITUTION_USER'],
    prerequisites: ['Clarification notice response'],
    description: 'Application returned to institution for specific document or parameter cure.',
  },
  {
    id: 'EVC_PENDING',
    name: 'Inspection pending scheduling',
    category: 'Inspection',
    slaDays: 10,
    roles: ['REGIONAL_OFFICER', 'BUREAU_OFFICER'],
    prerequisites: ['Signed review report', 'Prerequisites certified'],
    description: 'Review cleared; awaiting constitution and confirmation of physical visit date.',
  },
  {
    id: 'EVC_SCHEDULED',
    name: 'Inspection scheduled',
    category: 'Inspection',
    slaDays: 5,
    roles: ['REGIONAL_OFFICER', 'COMMITTEE_REVIEWER'],
    prerequisites: ['3-member expert panel confirmed', 'Institution formally notified'],
    description: 'Expert committee brief dispatched; on-site laboratory, facility, and cadre inspection.',
  },
  {
    id: 'EVC_COMPLETED',
    name: 'Inspection findings submitted',
    category: 'Inspection',
    slaDays: 3,
    roles: ['COMMITTEE_REVIEWER', 'REGIONAL_OFFICER'],
    prerequisites: ['Inspection photos', 'Signed report uploaded'],
    description: 'Inspection concluded; findings and video verification submitted to regional office.',
  },
  {
    id: 'COMMITTEE_REVIEW',
    name: 'Standing committee review',
    category: 'Committee',
    slaDays: 5,
    roles: ['COMMITTEE_REVIEWER', 'BUREAU_OFFICER'],
    prerequisites: ['Review and inspection concurrence'],
    description: 'Standing committee evaluates holistic statutory compliance.',
  },
  {
    id: 'AWAITING_DECISION',
    name: 'Awaiting final decision',
    category: 'Decision',
    slaDays: 4,
    roles: ['BUREAU_OFFICER', 'SYSTEM_ADMIN'],
    prerequisites: ['All panel recommendations collated'],
    description: 'Final recommendations collated, pending formal sign-off by competent authority.',
  },
  {
    id: 'APPROVED',
    name: 'Approval granted',
    category: 'Decision',
    slaDays: 0,
    roles: ['BUREAU_OFFICER', 'SYSTEM_ADMIN'],
    prerequisites: ['Statutory executive approval'],
    description: 'Formal regulatory approval granted and digitally stamped.',
  },
];

export function WorkflowMapPage() {
  const [selectedStageId, setSelectedStageId] = useState<string>('UNDER_SCRUTINY');

  const { data: applications } = useQuery({
    queryKey: ['workflow-map-apps'],
    queryFn: () => apiRequest<any[]>('/applications?limit=50'),
  });

  const selectedNode = STAGES_GRAPH.find((n) => n.id === selectedStageId) || STAGES_GRAPH[2];
  const appsInSelectedStage = (applications || []).filter((a) => a.currentStage === selectedStageId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-silver-bright tracking-tight">Workflow dependency map</h1>
          <p className="text-xs text-slate-muted">
            End-to-end statutory stage progression model and prerequisite DAG topology
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Topological Stage Graph */}
        <div className="lg:col-span-8 platinum-card p-6 rounded-2xl border border-graphite-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-graphite-border">
            <h2 className="text-xs uppercase tracking-wider text-platinum font-semibold">
              Regulatory state machine stages
            </h2>
            <span className="text-[10px] text-slate-muted">Click stage to inspect prerequisites and live cases</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {STAGES_GRAPH.map((node, index) => {
              const isSelected = node.id === selectedStageId;
              const countInStage = (applications || []).filter((a) => a.currentStage === node.id).length;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedStageId(node.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-gunmetal border-platinum'
                      : 'bg-obsidian border-graphite-border hover:bg-graphite'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-medium text-slate-muted">
                        Stage 0{index + 1} • {formatCategory(node.category)}
                      </span>
                      <h3 className="text-xs font-bold text-silver-bright mt-0.5">{node.name}</h3>
                    </div>
                    {countInStage > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-platinum/15 text-platinum border border-platinum/30">
                        {countInStage} active
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-muted mt-2 line-clamp-2">{node.description}</p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-graphite-border/60 text-[10px] text-slate-muted">
                    <span>SLA: {node.slaDays} days</span>
                    <span className="text-platinum">Prerequisites: {node.prerequisites.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Stage Detail Panel */}
        <div className="lg:col-span-4 platinum-card p-5 rounded-2xl border border-graphite-border space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-graphite-border">
            <h2 className="text-xs uppercase tracking-wider text-platinum font-semibold">
              Stage specifications
            </h2>
            <span className="text-[10px] font-medium text-status-success">Active rule</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-muted uppercase">Selected stage</span>
            <h3 className="text-base font-bold text-silver-bright mt-0.5">{selectedNode.name}</h3>
            <p className="text-xs text-slate-muted mt-1">{selectedNode.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-obsidian rounded-lg border border-graphite-border">
              <span className="text-[10px] text-slate-muted uppercase">Maximum SLA</span>
              <p className="text-sm font-semibold text-platinum mt-0.5">{selectedNode.slaDays} days</p>
            </div>
            <div className="p-3 bg-obsidian rounded-lg border border-graphite-border">
              <span className="text-[10px] text-slate-muted uppercase">Active applications</span>
              <p className="text-sm font-semibold text-silver-bright mt-0.5">{appsInSelectedStage.length}</p>
            </div>
          </div>

          {/* Mandatory Prerequisites */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-platinum font-semibold mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-status-success" />
              <span>Mandatory prerequisites</span>
            </h4>
            <div className="space-y-1.5">
              {selectedNode.prerequisites.map((p, i) => (
                <div key={i} className="p-2 bg-obsidian rounded border border-graphite-border text-xs text-silver">
                  ✓ {p}
                </div>
              ))}
            </div>
          </div>

          {/* Permitted Roles */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-platinum font-semibold mb-2 flex items-center gap-1.5">
              <UserCheck size={13} className="text-platinum" />
              <span>Authorized roles</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {selectedNode.roles.map((r) => (
                <span key={r} className="px-2 py-0.5 rounded text-[10px] bg-gunmetal border border-graphite-border text-platinum">
                  {formatRole(r)}
                </span>
              ))}
            </div>
          </div>

          {/* Applications residing in this stage */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-platinum font-semibold mb-2">
              Applications in this stage ({appsInSelectedStage.length})
            </h4>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {appsInSelectedStage.length === 0 ? (
                <p className="text-xs text-slate-muted">Zero applications currently pending in this stage.</p>
              ) : (
                appsInSelectedStage.map((app: any) => (
                  <Link
                    key={app.id}
                    to={`/applications/${app.id}`}
                    className="block p-2 rounded bg-obsidian hover:bg-graphite border border-graphite-border text-xs transition-colors"
                  >
                    <div className="flex justify-between font-mono font-medium text-silver-bright">
                      <span>{app.applicationNumber}</span>
                      <span className="text-[10px] text-slate-muted">{app.region} region</span>
                    </div>
                    <p className="text-[11px] text-slate-muted truncate">{app.institution.name}</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkflowMapPage;
