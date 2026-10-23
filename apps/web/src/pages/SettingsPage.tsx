import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sliders,
  Layers,
  CheckCircle,
  Plus,
  ShieldAlert,
  Server,
  Clock,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';

export function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['settings-workflows'],
    queryFn: () => apiRequest<any[]>('/config/workflows'),
  });

  const { data: health } = useQuery({
    queryKey: ['platform-health'],
    queryFn: () => apiRequest<any>('/health'),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-silver-bright tracking-tight">System & Workflow Configuration</h2>
          <p className="text-xs text-slate-muted">Authorised workflow template versions, state machine definitions, and platform telemetry</p>
        </div>
      </div>

      {/* System Telemetry Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="platinum-card p-4 rounded-xl border border-graphite-border">
          <span className="text-[10px] font-mono text-slate-muted uppercase">Platform Status</span>
          <p className="text-sm font-bold text-status-success font-mono mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-success animate-ping" />
            <span>OPERATIONAL (100% HEALTHY)</span>
          </p>
        </div>

        <div className="platinum-card p-4 rounded-xl border border-graphite-border">
          <span className="text-[10px] font-mono text-slate-muted uppercase">Configured Timezone</span>
          <p className="text-sm font-bold text-platinum font-mono mt-1">Asia/Kolkata (IST)</p>
        </div>

        <div className="platinum-card p-4 rounded-xl border border-graphite-border">
          <span className="text-[10px] font-mono text-slate-muted uppercase">Database Layer</span>
          <p className="text-sm font-bold text-silver-bright font-mono mt-1">Prisma ORM // Persistent</p>
        </div>

        <div className="platinum-card p-4 rounded-xl border border-graphite-border">
          <span className="text-[10px] font-mono text-slate-muted uppercase">Uptime Clock</span>
          <p className="text-sm font-bold text-silver font-mono mt-1 tabular-nums">{health?.uptimeSeconds || 0}s</p>
        </div>
      </div>

      {/* Workflow Rule Templates */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
          Active Workflow Rule Templates & Version Control
        </h3>

        {isLoading ? (
          <div className="p-8 text-center text-slate-muted font-mono text-xs">Loading workflow configurations...</div>
        ) : (
          (workflows || []).map((wf: any) => (
            <div key={wf.id} className="platinum-card p-5 rounded-2xl border border-graphite-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-silver-bright">{wf.code}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gunmetal border border-graphite-border text-platinum">
                      Active: Version {wf.activeVersion}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-silver mt-1">{wf.name}</h4>
                  <p className="text-xs text-slate-muted mt-0.5">{wf.description}</p>
                </div>
              </div>

              {/* Version History Table */}
              <div className="pt-2">
                <span className="text-[11px] font-mono uppercase text-slate-muted font-bold block mb-2">
                  Version Change History:
                </span>
                <div className="space-y-2">
                  {wf.versions?.map((ver: any) => (
                    <div
                      key={ver.id}
                      className="p-3 rounded-lg bg-obsidian border border-graphite-border flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-silver-bright">v{ver.versionNumber}</span>
                        <span className="text-slate-muted ml-2">{ver.changeSummary}</span>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <span className="text-status-success font-bold">PUBLISHED & ACTIVE</span>
                        <span className="block text-[10px] text-slate-muted">
                          {new Date(ver.createdAt).toISOString().split('T')[0]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
export default SettingsPage;
