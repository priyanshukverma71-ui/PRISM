import React from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { SpatialCaseNode } from './SpatialHolodeck.js';
import { formatPlainStage } from '../../lib/plainLanguage.js';

interface HoloDossierDrawerProps {
  node: SpatialCaseNode | null;
  onClose: () => void;
  temporalOffsetDays: number;
  activeIntervention: string;
  onAdvanceStage?: (appId: string) => void;
  onReturnCase?: (appId: string) => void;
}

export function HoloDossierDrawer({
  node,
  onClose,
  temporalOffsetDays,
  activeIntervention,
}: HoloDossierDrawerProps) {
  if (!node) return null;

  // Calculate simulated risk with temporal offset
  let projectedRisk = node.riskScore;
  if (temporalOffsetDays > 0) {
    if (node.deadlineDaysRemaining - temporalOffsetDays < 0) projectedRisk += 35;
    if (node.hasExpiringLease && node.leaseExpiresInDays !== undefined && temporalOffsetDays >= node.leaseExpiresInDays) {
      projectedRisk += 45;
    }
  }
  if (activeIntervention !== 'NONE') {
    projectedRisk = Math.max(10, projectedRisk - 35);
  }
  projectedRisk = Math.min(100, Math.max(0, projectedRisk));

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-graphite/95 backdrop-blur-2xl border-l border-graphite-border shadow-2xl z-[9990] flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-graphite-border">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-platinum block">
            Application dossier
          </span>
          <h3 className="text-base font-bold text-silver-bright font-mono">{node.applicationNumber}</h3>
        </div>

        <button
          onClick={onClose}
          aria-label="Close dossier drawer"
          className="p-1.5 rounded-lg bg-obsidian border border-graphite-border hover:bg-gunmetal text-slate-muted hover:text-silver cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="py-4 space-y-5 flex-1">
        {/* Institution Info */}
        <div>
          <h4 className="text-sm font-semibold text-silver">{node.institutionName}</h4>
          <span className="text-xs text-slate-muted">
            {node.region} region • Stage: {formatPlainStage(node.stage)}
          </span>
        </div>

        {/* 4D Temporal Telemetry */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-obsidian rounded-xl border border-graphite-border">
            <span className="text-[10px] text-slate-muted uppercase">Base risk score</span>
            <p className="text-xl font-bold font-mono text-silver-bright mt-0.5">{node.riskScore} / 100</p>
          </div>

          <div
            className={`p-3 rounded-xl border ${
              projectedRisk >= 80
                ? 'bg-status-critical/10 border-status-critical/40 text-status-critical'
                : projectedRisk >= 55
                ? 'bg-status-warning/10 border-status-warning/40 text-status-warning'
                : 'bg-obsidian border-graphite-border text-platinum'
            }`}
          >
            <span className="text-[10px] uppercase font-semibold">Projected risk</span>
            <p className="text-xl font-bold font-mono mt-0.5">{projectedRisk} / 100</p>
          </div>
        </div>

        {/* Active Temporal Alerts */}
        {temporalOffsetDays > 0 && node.hasExpiringLease && (
          <div className="p-3 rounded-xl bg-status-critical/15 border border-status-critical/30 space-y-1">
            <div className="flex items-center gap-1.5 text-status-critical text-xs font-semibold">
              <AlertTriangle size={14} />
              <span>Projected: Land lease expiration</span>
            </div>
            <p className="text-xs text-silver/80">
              In this timeline, campus plot lease expires in {node.leaseExpiresInDays} days without renewal proof.
            </p>
          </div>
        )}

        {/* Quick Statutory Actions */}
        <div className="space-y-2 pt-2">
          <span className="text-xs uppercase tracking-wider text-platinum font-semibold block">
            Actions
          </span>

          <Link
            to={`/applications/${node.id}`}
            className="w-full platinum-button-primary py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>View application</span>
            <ExternalLink size={13} />
          </Link>

          <Link
            to={`/futurelab?appId=${node.id}`}
            className="w-full platinum-button-secondary py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Run simulation</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Prerequisites Checklist */}
        <div className="space-y-2 pt-2 border-t border-graphite-border">
          <span className="text-xs uppercase tracking-wider text-platinum font-semibold block">
            Stage prerequisites
          </span>
          <div className="space-y-1.5 text-xs">
            <div className="p-2 rounded bg-obsidian border border-graphite-border text-status-success flex items-center gap-2">
              <CheckCircle2 size={13} />
              <span>Processing fee cleared</span>
            </div>
            <div className="p-2 rounded bg-obsidian border border-graphite-border text-status-success flex items-center gap-2">
              <CheckCircle2 size={13} />
              <span>Affidavit upload verified</span>
            </div>
            <div
              className={`p-2 rounded border flex items-center gap-2 ${
                node.hasExpiringLease
                  ? 'bg-status-critical/10 border-status-critical/30 text-status-critical'
                  : 'bg-obsidian border-graphite-border text-status-success'
              }`}
            >
              {node.hasExpiringLease ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
              <span>30-year registered land lease deed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HoloDossierDrawer;
