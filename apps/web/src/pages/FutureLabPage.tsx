import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  FlaskConical,
  Play,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Info,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { formatPlainStage, formatSeverity, formatIntervention } from '../lib/plainLanguage.js';

export function FutureLabPage() {
  const [searchParams] = useSearchParams();
  const defaultAppId = searchParams.get('appId') || '';

  const [selectedAppId, setSelectedAppId] = useState<string>(defaultAppId);
  const [scrutinyDelayDays, setScrutinyDelayDays] = useState<number>(5);
  const [evcDelayDays, setEvcDelayDays] = useState<number>(7);
  const [missingPrereqs, setMissingPrereqs] = useState<string[]>(['FIRE_NOC']);
  const [leaseTiming, setLeaseTiming] = useState<'ON_TIME' | 'LATE_5_DAYS' | 'LATE_15_DAYS' | 'EXPIRED'>('LATE_15_DAYS');
  const [workloadMultiplier, setWorkloadMultiplier] = useState<number>(1.5);
  const [intervention, setIntervention] = useState<'NONE' | 'FAST_TRACK_EVC' | 'SPECIAL_SCRUTINY_DRIVE' | 'PROVISIONAL_UNDERTAKING'>('FAST_TRACK_EVC');

  // Load applications list for selector
  const { data: applications } = useQuery({
    queryKey: ['futurelab-apps'],
    queryFn: () => apiRequest<any[]>('/applications?limit=20'),
  });

  useEffect(() => {
    if (!selectedAppId && applications && applications.length > 0) {
      setSelectedAppId(applications[0].id);
    }
  }, [applications, selectedAppId]);

  const simulationMutation = useMutation({
    mutationFn: (params: any) =>
      apiRequest('/simulations', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  });

  const handleRunSimulation = () => {
    if (!selectedAppId) return;
    simulationMutation.mutate({
      applicationId: selectedAppId,
      scrutinyDelayDays,
      evcDelayDays,
      missingPrerequisites: missingPrereqs,
      leaseRenewalTiming: leaseTiming,
      workloadPressureMultiplier: workloadMultiplier,
      interventionScenario: intervention,
    });
  };

  const togglePrereq = (code: string) => {
    setMissingPrereqs((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  const simResult = simulationMutation.data;

  return (
    <div className="space-y-6">
      {/* Simulation Banner Header */}
      <div className="platinum-card p-6 rounded-2xl border border-graphite-border relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-status-warning/15 border border-status-warning/40 text-xs text-status-warning mb-2">
              <FlaskConical size={14} />
              <span>Counterfactual compliance simulator</span>
            </div>
            <h1 className="text-2xl font-bold text-silver-bright tracking-tight">
              What-if simulator
            </h1>
            <p className="text-xs text-slate-muted max-w-2xl mt-1 leading-relaxed">
              Simulate review holds, missing documents, lease delays, and regional committee shortages on a separate virtual snapshot.
              Real regulatory records are strictly protected and never modified.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg border border-graphite-border bg-graphite text-xs text-slate-muted">
              Snapshot mode: Isolated memory
            </span>
          </div>
        </div>

        {/* Required Plain Language Disclaimer */}
        <div className="mt-4 p-2.5 rounded-lg bg-obsidian border border-graphite-border text-xs text-platinum flex items-center gap-2">
          <Info size={14} className="text-status-warning flex-shrink-0" />
          <span>Notice: This is a what-if simulation — not an official regulatory decision. For proactive regulatory risk assessment and deadline forecasting only.</span>
        </div>
      </div>

      {/* Main Simulator Grid: Controls on Left, Live Counterfactual on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Scenario Controls */}
        <div className="lg:col-span-5 platinum-card p-5 rounded-2xl border border-graphite-border space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-graphite-border">
            <h3 className="text-xs uppercase tracking-wider text-platinum font-semibold">
              Scenario parameters
            </h3>
            <span className="text-[10px] text-slate-muted">Synthetic sandbox</span>
          </div>

          {/* Select Base Case */}
          <div>
            <label className="block text-xs font-medium text-platinum mb-1.5">Target application dossier</label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none cursor-pointer"
            >
              {applications?.map((app: any) => (
                <option key={app.id} value={app.id}>
                  {app.applicationNumber} — {app.institution?.name?.slice(0, 32)}... [{formatPlainStage(app.currentStage)}]
                </option>
              ))}
            </select>
          </div>

          {/* Scrutiny Hold Days */}
          <div>
            <div className="flex justify-between text-xs text-platinum mb-1">
              <span>Review delay duration</span>
              <span className="font-semibold text-silver-bright">{scrutinyDelayDays} days</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={scrutinyDelayDays}
              onChange={(e) => setScrutinyDelayDays(parseInt(e.target.value, 10))}
              className="w-full accent-platinum cursor-pointer"
            />
          </div>

          {/* EVC Scheduling Delay Days */}
          <div>
            <div className="flex justify-between text-xs text-platinum mb-1">
              <span>Inspection scheduling delay</span>
              <span className="font-semibold text-silver-bright">{evcDelayDays} days</span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              value={evcDelayDays}
              onChange={(e) => setEvcDelayDays(parseInt(e.target.value, 10))}
              className="w-full accent-platinum cursor-pointer"
            />
          </div>

          {/* Missing Prerequisites */}
          <div>
            <label className="block text-xs font-medium text-platinum mb-1.5">Missing prerequisites</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { code: 'FIRE_NOC', label: 'Fire safety certificate' },
                { code: 'STRUCTURAL_CERT', label: 'Building stability proof' },
                { code: 'LAND_LEASE', label: 'Registered land lease' },
                { code: 'FACULTY_CADRE', label: 'Faculty cadre compliance' },
              ].map((p) => {
                const isSelected = missingPrereqs.includes(p.code);
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => togglePrereq(p.code)}
                    className={`p-2 rounded-lg text-[11px] border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-status-critical/15 text-status-critical border-status-critical/40 font-medium'
                        : 'bg-obsidian text-slate-muted border-graphite-border hover:text-silver'
                    }`}
                  >
                    {isSelected ? '✕ Missing: ' : '+ Verified: '} {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lease Renewal Timing */}
          <div>
            <label className="block text-xs font-medium text-platinum mb-1.5">Lease submission timing</label>
            <select
              value={leaseTiming}
              onChange={(e: any) => setLeaseTiming(e.target.value)}
              className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none cursor-pointer"
            >
              <option value="ON_TIME">Submitted on time (&gt; 30 days before expiry)</option>
              <option value="LATE_5_DAYS">Submitted 5 days late (within grace period)</option>
              <option value="LATE_15_DAYS">Submitted 15 days late (high urgency)</option>
              <option value="EXPIRED">Unrenewed / Expired land lease deed</option>
            </select>
          </div>

          {/* Workload Pressure */}
          <div>
            <div className="flex justify-between text-xs text-platinum mb-1">
              <span>Regional review workload pressure</span>
              <span className="font-semibold text-silver-bright">{workloadMultiplier.toFixed(1)}x normal volume</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.1"
              value={workloadMultiplier}
              onChange={(e) => setWorkloadMultiplier(parseFloat(e.target.value))}
              className="w-full accent-platinum cursor-pointer"
            />
          </div>

          {/* Simulated Intervention */}
          <div>
            <label className="block text-xs font-medium text-platinum mb-1.5">Simulated administrative action</label>
            <select
              value={intervention}
              onChange={(e: any) => setIntervention(e.target.value)}
              className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none cursor-pointer"
            >
              <option value="NONE">None (Standard regulatory timeline)</option>
              <option value="FAST_TRACK_EVC">Central inspection pool (-6 days)</option>
              <option value="SPECIAL_SCRUTINY_DRIVE">Accelerated review drive (-4 days)</option>
              <option value="PROVISIONAL_UNDERTAKING">Accept provisional undertaking with escrow</option>
            </select>
          </div>

          {/* Trigger Simulation Button */}
          <button
            onClick={handleRunSimulation}
            disabled={simulationMutation.isPending}
            className="w-full platinum-button-primary py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play size={14} className="fill-obsidian" />
            <span>{simulationMutation.isPending ? 'Simulating projected timeline...' : 'Run simulation'}</span>
          </button>
        </div>

        {/* Right Column: Live Counterfactual Visualizer */}
        <div className="lg:col-span-7 space-y-5">
          {!simResult ? (
            <div className="platinum-card p-12 rounded-2xl border border-graphite-border text-center flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-16 h-16 rounded-full bg-gunmetal flex items-center justify-center border border-graphite-border text-platinum mb-4">
                <FlaskConical size={28} />
              </div>
              <h3 className="text-base font-semibold text-silver-bright">Ready to run simulation</h3>
              <p className="text-xs text-slate-muted max-w-sm mt-1 leading-relaxed">
                Configure timeline parameters on the left and click Run simulation to observe projected delays, blocked stages, and risk shifts.
              </p>
              <button
                onClick={handleRunSimulation}
                className="mt-6 platinum-button-secondary px-5 py-2 rounded-lg text-xs font-medium cursor-pointer"
              >
                Run baseline simulation
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Simulation Result Header */}
              <div className="p-3.5 rounded-xl bg-gunmetal/40 border border-graphite-border flex items-center justify-between text-xs">
                <span className="text-silver-bright font-medium">
                  Simulation complete. Review the projected delays and risks.
                </span>
                <span className="text-platinum text-[11px]">Simulated projection</span>
              </div>

              {/* Comparative Outcome Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="platinum-card p-4 rounded-xl border border-graphite-border">
                  <span className="text-[10px] text-slate-muted uppercase">Baseline projection</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl font-bold font-mono text-silver-bright">{simResult.baseline.projectedCompletionDate}</span>
                  </div>
                  <span className="text-[11px] text-slate-muted block mt-1">
                    Risk score: {simResult.baseline.riskScore} • {formatSeverity(simResult.baseline.riskCategory)}
                  </span>
                </div>

                <div className="platinum-card p-4 rounded-xl border border-status-warning/40 bg-status-warning/5">
                  <span className="text-[10px] text-status-warning uppercase font-semibold">Simulated outcome</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl font-bold font-mono text-silver-bright">{simResult.simulated.projectedCompletionDate}</span>
                    <span className="text-xs font-bold text-status-critical">
                      +{simResult.delta.delayDaysTotal} days
                    </span>
                  </div>
                  <span className="text-[11px] text-status-warning block mt-1">
                    Risk score: {simResult.simulated.riskScore} • {formatSeverity(simResult.simulated.riskCategory)} (+{simResult.delta.riskScoreDelta} pts)
                  </span>
                </div>
              </div>

              {/* Newly Blocked Stages & Missed Deadlines Alerts */}
              {(simResult.delta.newlyBlockedStages?.length > 0 || simResult.delta.missedDeadlines?.length > 0) && (
                <div className="p-4 rounded-xl bg-status-critical/10 border border-status-critical/30 space-y-2">
                  <div className="flex items-center gap-2 text-status-critical font-medium text-xs">
                    <ShieldAlert size={15} />
                    <span>Predicted bottlenecks and blocked stages</span>
                  </div>
                  {simResult.delta.newlyBlockedStages?.map((stage: string) => (
                    <p key={stage} className="text-xs text-silver">
                      Stage <span className="font-semibold text-status-critical">{formatPlainStage(stage)}</span> is blocked from starting due to missing prerequisites.
                    </p>
                  ))}
                  {simResult.delta.missedDeadlines?.map((d: string) => (
                    <p key={d} className="text-xs text-silver">
                      Deadline risk: <span className="font-medium text-status-warning">{d}</span> will breach the statutory timeframe.
                    </p>
                  ))}
                </div>
              )}

              {/* Visual Branching Timeline Comparison */}
              <div className="platinum-card p-5 rounded-xl border border-graphite-border space-y-4">
                <h4 className="text-xs uppercase tracking-wider text-platinum font-semibold">
                  Branching stage timeline
                </h4>

                <div className="space-y-3">
                  {simResult.simulated.timeline.map((simNode: any, idx: number) => {
                    const baseNode = simResult.baseline.timeline[idx];
                    return (
                      <div key={simNode.stage} className="p-3 rounded-lg bg-obsidian border border-graphite-border">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-silver-bright">{formatPlainStage(simNode.stage)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-muted line-through font-mono text-[11px]">{baseNode?.estimatedDate}</span>
                            <ArrowRight size={11} className="text-slate-muted" />
                            <span className="font-semibold text-platinum font-mono text-[11px]">{simNode.estimatedDate}</span>
                            {simNode.delayDays > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-status-critical/20 text-status-critical border border-status-critical/40">
                                +{simNode.delayDays}d
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommended Administrative Interventions */}
              <div className="platinum-card p-5 rounded-xl border border-graphite-border space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-platinum font-semibold flex items-center gap-2">
                  <Sparkles size={14} className="text-status-success" />
                  <span>Recommended administrative interventions</span>
                </h4>
                <div className="space-y-2">
                  {simResult.recommendedInterventions.map((inv: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-obsidian border border-graphite-border text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-silver-bright">{inv.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-gunmetal text-platinum">
                          Feasibility: {inv.feasibility}
                        </span>
                      </div>
                      <p className="text-slate-muted">{inv.action}</p>
                      <p className="text-status-success text-[11px]">Impact: {inv.expectedImpact}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Simulation Assumptions */}
              <div className="p-3 bg-graphite rounded-lg border border-graphite-border text-xs text-slate-muted space-y-1">
                <span className="font-semibold uppercase text-platinum text-[10px]">Simulation assumptions:</span>
                {simResult.assumptions.map((a: string, idx: number) => (
                  <p key={idx}>• {a}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FutureLabPage;
