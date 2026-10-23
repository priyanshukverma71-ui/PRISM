import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  GitFork,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';

interface WorkflowNode {
  id: string;
  name: string;
  category: 'PREPARATION' | 'SCRUTINY' | 'EVC' | 'COMMITTEE' | 'FINAL';
  slaDays: number;
  roles: string[];
  prerequisites: string[];
  description: string;
}

const STAGES_GRAPH: WorkflowNode[] = [
  {
    id: 'DRAFT',
    name: 'Draft Application',
    category: 'PREPARATION',
    slaDays: 30,
    roles: ['INSTITUTION_USER'],
    prerequisites: ['Basic Institutional Profile'],
    description: 'Institution prepares application details, courses, and infrastructure documentation.',
  },
  {
    id: 'SUBMITTED',
    name: 'Transmitted to Regional Office',
    category: 'PREPARATION',
    slaDays: 3,
    roles: ['INSTITUTION_USER', 'REGIONAL_OFFICER'],
    prerequisites: ['Statutory Processing Fee', 'Affidavit Upload'],
    description: 'Case logged into regional intake queue; pending allocation to scrutiny panel.',
  },
  {
    id: 'UNDER_SCRUTINY',
    name: 'Regional Scrutiny Committee',
    category: 'SCRUTINY',
    slaDays: 7,
    roles: ['REGIONAL_OFFICER'],
    prerequisites: ['Land Ownership & 30-Yr Lease', 'Approved Building Plan', 'Fire Safety NOC'],
    description: 'Comprehensive scrutiny of land encumbrance, building certificates, and faculty norms.',
  },
  {
    id: 'CLARIFICATION_REQUIRED',
    name: 'Deficiency Remediation',
    category: 'SCRUTINY',
    slaDays: 5,
    roles: ['REGIONAL_OFFICER', 'INSTITUTION_USER'],
    prerequisites: ['Deficiency Notice Response'],
    description: 'Application returned to institution for specific document or parameter cure.',
  },
  {
    id: 'EVC_PENDING',
    name: 'EVC Pending Scheduling',
    category: 'EVC',
    slaDays: 10,
    roles: ['REGIONAL_OFFICER', 'BUREAU_OFFICER'],
    prerequisites: ['Signed Scrutiny Report', 'Prerequisites Certified'],
    description: 'Scrutiny cleared; awaiting constitution and confirmation of physical visit date.',
  },
  {
    id: 'EVC_SCHEDULED',
    name: 'EVC Inspection Scheduled',
    category: 'EVC',
    slaDays: 5,
    roles: ['REGIONAL_OFFICER', 'COMMITTEE_REVIEWER'],
    prerequisites: ['3-Member Expert Panel Confirmed', 'Institution Formally Notified'],
    description: 'Expert committee brief dispatched; on-site laboratory, facility, and cadre inspection.',
  },
  {
    id: 'EVC_COMPLETED',
    name: 'EVC Findings Submitted',
    category: 'EVC',
    slaDays: 3,
    roles: ['COMMITTEE_REVIEWER', 'REGIONAL_OFFICER'],
    prerequisites: ['Geotagged Inspection Photos', 'Signed EVC Report Uploaded'],
    description: 'Inspection concluded; findings and video verification submitted to regional office.',
  },
  {
    id: 'COMMITTEE_REVIEW',
    name: 'SAC / SHC Review',
    category: 'COMMITTEE',
    slaDays: 5,
    roles: ['COMMITTEE_REVIEWER', 'BUREAU_OFFICER'],
    prerequisites: ['Scrutiny & EVC Concurrence'],
    description: 'Standing Hearing or Appellate Committee evaluates holistic statutory compliance.',
  },
  {
    id: 'AWAITING_DECISION',
    name: 'Awaiting Competent Decision',
    category: 'FINAL',
    slaDays: 4,
    roles: ['BUREAU_OFFICER', 'SYSTEM_ADMIN'],
    prerequisites: ['All Panel Recommendations Collated'],
    description: 'Final recommendations collated, pending formal sign-off by competent authority.',
  },
  {
    id: 'APPROVED',
    name: 'Letter of Approval (EoA)',
    category: 'FINAL',
    slaDays: 0,
    roles: ['BUREAU_OFFICER', 'SYSTEM_ADMIN'],
    prerequisites: ['Statutory Executive Approval'],
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
          <h2 className="text-xl font-bold text-silver-bright tracking-tight">Workflow Dependency Map</h2>
          <p className="text-xs text-slate-muted">
            End-to-end statutory stage progression model and prerequisite DAG topology
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-muted">Protocol: APH 2025-26 V1.0</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Topological Stage Graph */}
        <div className="lg:col-span-8 platinum-card p-6 rounded-2xl border border-graphite-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-graphite-border">
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
              Regulatory State Machine Nodes
            </h3>
            <span className="text-[10px] font-mono text-slate-muted">Click node to inspect prerequisites & live cases</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {STAGES_GRAPH.map((node, index) => {
              const isSelected = node.id === selectedStageId;
              const countInStage = (applications || []).filter((a) => a.currentStage === node.id).length;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedStageId(node.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gunmetal border-platinum shadow-platinum transform -translate-y-0.5'
                      : 'bg-obsidian border-graphite-border hover:border-slate-subtle hover:bg-graphite'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-muted">
                        STAGE 0{index + 1} // {node.category}
                      </span>
                      <h4 className="text-xs font-bold text-silver-bright mt-0.5">{node.name}</h4>
                    </div>
                    {countInStage > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-platinum/15 text-platinum border border-platinum/30">
                        {countInStage} active
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-muted mt-2 line-clamp-2">{node.description}</p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-graphite-border/60 text-[10px] font-mono text-slate-muted">
                    <span>SLA: {node.slaDays} Days</span>
                    <span className="text-platinum">Prereqs: {node.prerequisites.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Stage Detail Panel */}
        <div className="lg:col-span-4 platinum-card p-5 rounded-2xl border border-graphite-border space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-graphite-border">
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
              Stage Specifications
            </h3>
            <span className="text-[10px] font-mono text-status-success">ACTIVE RULE</span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-slate-muted uppercase">Selected Stage</span>
            <h4 className="text-base font-bold text-silver-bright mt-0.5">{selectedNode.name}</h4>
            <p className="text-xs text-slate-muted mt-1">{selectedNode.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-obsidian rounded-lg border border-graphite-border">
              <span className="text-[10px] font-mono text-slate-muted uppercase">Max SLA Window</span>
              <p className="text-sm font-bold text-platinum font-mono mt-0.5">{selectedNode.slaDays} Days</p>
            </div>
            <div className="p-3 bg-obsidian rounded-lg border border-graphite-border">
              <span className="text-[10px] font-mono text-slate-muted uppercase">Active Cases</span>
              <p className="text-sm font-bold text-silver-bright font-mono mt-0.5">{appsInSelectedStage.length}</p>
            </div>
          </div>

          {/* Mandatory Prerequisites */}
          <div>
            <h5 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-status-success" />
              <span>Mandatory Prerequisites</span>
            </h5>
            <div className="space-y-1.5">
              {selectedNode.prerequisites.map((p, i) => (
                <div key={i} className="p-2 bg-obsidian rounded border border-graphite-border text-xs text-silver font-mono">
                  ✓ {p}
                </div>
              ))}
            </div>
          </div>

          {/* Permitted Roles */}
          <div>
            <h5 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold mb-2 flex items-center gap-1.5">
              <UserCheck size={13} className="text-platinum" />
              <span>Authorised Action Roles</span>
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {selectedNode.roles.map((r) => (
                <span key={r} className="px-2 py-0.5 rounded text-[10px] font-mono bg-gunmetal border border-graphite-border text-platinum">
                  {(r || '').replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Applications residing in this stage */}
          <div>
            <h5 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold mb-2">
              Applications In This Stage ({appsInSelectedStage.length})
            </h5>
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
                    <div className="flex justify-between font-mono font-bold text-silver-bright">
                      <span>{app.applicationNumber}</span>
                      <span className="text-[10px] text-slate-muted">{app.region}</span>
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
