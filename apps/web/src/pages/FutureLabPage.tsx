import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  FlaskConical,
  Play,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Info,
  Calendar,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';

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
      <div className="platinum-card p-6 rounded-2xl border border-graphite-border relative overflow-hidden bg-obsidian-gradient">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-status-warning/15 border border-status-warning/40 text-xs font-mono text-status-warning mb-2">
              <FlaskConical size={14} />
              <span>PRISM FUTURELAB // COUNTERFACTUAL COMPLIANCE SIMULATOR</span>
            </div>
            <h2 className="text-2xl font-black text-silver-bright tracking-tight">
              Predictive Downstream Bottleneck Engine
            </h2>
            <p className="text-xs text-slate-muted max-w-2xl mt-1">
              Simulate scrutiny holds, missing documents, lease delays, and regional committee shortages on a separate virtual snapshot.
              Real production cases are strictly protected and never mutated.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg border border-graphite-border bg-graphite text-[11px] font-mono text-slate-muted">
              Snapshot Mode: ISOLATED MEMORY
            </span>
          </div>
        </div>

        {/* Required Disclaimer Notice */}
        <div className="mt-4 p-2.5 rounded-lg bg-obsidian/70 border border-graphite-border text-[11px] font-mono text-platinum flex items-center gap-2">
          <Info size={14} className="text-status-warning" />
          <span>SIMULATION — NOT AN OFFICIAL DECISION. For proactive regulatory risk assessment and deadline forecasting only.</span>
        </div>
      </div>

      {/* Main Simulator Grid: Controls on Left, Live Counterfactual on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Scenario Controls */}
        <div className="lg:col-span-5 platinum-card p-5 rounded-2xl border border-graphite-border space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-graphite-border">
            <h3 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
              Scenario Parameters
            </h3>
            <span className="text-[10px] font-mono text-slate-muted">Synthetic Sandbox</span>
          </div>

          {/* Select Base Case */}
          <div>
            <label className="block text-xs font-medium text-platinum mb-1.5 font-mono">Target Application Case</label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="w-full bg-obsidian border border-graphite-border rounded-lg p-2.5 text-xs text-silver focus:outline-none"
            >
              {applications?.map((app: any) => (
                <option key={app.id} value={app.id}>
                  {app.applicationNumber} — {app.institution.name.slice(0, 30)}... [{app.currentStage}]
                </option>
              ))}
            </select>
          </div>

          {/* Scrutiny Delay Slider */}
          <div>
            <div className="flex justify-between text-xs font-mono text-platinum mb-1">
              <span>Scrutiny Verification Delay</span>
              <span className="font-bold text-silver-bright">{scrutinyDelayDays} Days</span>
            </div>
            <div className="flex gap-2">
              {[0, 1, 3, 5, 10].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setScrutinyDelayDays(days)}
                  className={`flex-1 py-1.5 rounded text-xs font-mono font-medium transition-colors border ${
                    scrutinyDelayDays === days
                      ? 'bg-platinum text-obsidian border-white font-bold'
                      : 'bg-obsidian text-slate-muted border-graphite-border hover:text-silver'
                  }`}
                >
                  +{days}d
                </button>
              ))}
            </div>
          </div>

          {/* EVC Scheduling Delay */}
          <div>
            <div className="flex justify-between text-xs font-mono text-platinum mb-1">
              <span>EVC Committee Scheduling Delay</span>
              <span className="font-bold text-silver-bright">{evcDelayDays} Days</span>
            </div>
            <div className="flex gap-2">
              {[0, 2, 5, 7, 14].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setEvcDelayDays(days)}
                  className={`flex-1 py-1.5 rounded text-xs font-mono font-medium transition-colors border ${
                    evcDelayDays === days
                      ? 'bg-platinum text-obsidian border-white font-bold'
                      : 'bg-obsidian text-slate-muted border-graphite-border hover:text-silver'
                  }`}
                >
                  +{days}d
                </button>
              ))}
            </div>
          </div>

          {/* Missing Prerequisites */}
          <div>
            <label className="block text-xs font-medium text-platinum mb-2 font-mono">
              Incomplete Regulatory Prerequisites
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { code: 'FIRE_NOC', label: 'Fire Safety NOC' },
                { code: 'LAND_LEASE', label: '30-Yr Lease Deed' },
                { code: 'BUILDING_PLAN', label: 'Approved Building Plan' },
                { code: 'CORPUS_FUND', label: 'Statutory FDR / Escrow' },
              ].map((p) => {
                const isSelected = missingPrereqs.includes(p.code);
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => togglePrereq(p.code)}
                    className={`p-2 rounded border text-left font-mono text-[11px] transition-colors ${
                      isSelected
                        ? 'bg-status-critical/15 text-status-critical border-status-critical/40 font-bold'
                        : 'bg-obsidian text-slate-muted border-graphite-border hover:text-silver'
                    }`}
                  >
                    {isSelected ? '✕ Deficient: ' : '+ Clean: '} {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lease Renewal Timing */}
          <div>
            <label className="block text-xs font-medium text-platinum mb-1.5 font-mono">Lease Renewal Submission Timing</label>
            <select
              value={leaseTiming}
              onChange={(e: any) => setLeaseTiming(e.target.value)}
              className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
            >
              <option value="ON_TIME">Submitted On Time (&gt; 30 days before expiry)</option>
              <option value="LATE_5_DAYS">Submitted 5 Days Late (Within Cure Window)</option>
              <option value="LATE_15_DAYS">Submitted 15 Days Late (High Scrutiny Alert)</option>
              <option value="EXPIRED">Unrenewed / Expired Land Lease Deed</option>
            </select>
          </div>

          {/* Workload Pressure */}
          <div>
            <div className="flex justify-between text-xs font-mono text-platinum mb-1">
              <span>Regional Workload Pressure Factor</span>
              <span className="font-bold text-silver-bright">{workloadMultiplier.toFixed(1)}x Capacity</span>
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

          {/* Intervention Scenario */}
          <div>
            <label className="block text-xs font-medium text-platinum mb-1.5 font-mono">Simulated Administrative Intervention</label>
            <select
              value={intervention}
              onChange={(e: any) => setIntervention(e.target.value)}
              className="w-full bg-obsidian border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none"
            >
              <option value="NONE">None (Strict Default Process)</option>
              <option value="FAST_TRACK_EVC">Fast-Track Central EVC Expert Pool (-6 Days)</option>
              <option value="SPECIAL_SCRUTINY_DRIVE">Special Regional Scrutiny Weekend Drive (-4 Days)</option>
              <option value="PROVISIONAL_UNDERTAKING">Accept Provisional Indemnity Bond with Escrow</option>
            </select>
          </div>

          {/* Trigger Simulation Button */}
          <button
            onClick={handleRunSimulation}
            disabled={simulationMutation.isPending}
            className="w-full platinum-button-primary py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-platinum"
          >
            <Play size={14} className="fill-obsidian" />
            <span>{simulationMutation.isPending ? 'Simulating Downstream Timeline...' : 'Execute Counterfactual Simulation'}</span>
          </button>
        </div>

        {/* Right Column: Live Counterfactual Visualizer */}
        <div className="lg:col-span-7 space-y-5">
          {!simResult ? (
            <div className="platinum-card p-12 rounded-2xl border border-graphite-border text-center flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-16 h-16 rounded-full bg-gunmetal flex items-center justify-center border border-graphite-border text-platinum mb-4 animate-pulse-subtle">
                <FlaskConical size={28} />
              </div>
              <h3 className="text-base font-bold text-silver-bright">Ready to Compute Simulation Scenario</h3>
              <p className="text-xs text-slate-muted max-w-sm mt-1">
                Configure regulatory latency parameters on the left and click Execute to observe downstream delays, blocked stages, and risk shifts.
              </p>
              <button
                onClick={handleRunSimulation}
                className="mt-6 platinum-button-secondary px-5 py-2 rounded-lg text-xs font-mono font-semibold"
              >
                Run Baseline Scenario
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Comparative Outcome Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="platinum-card p-4 rounded-xl border border-graphite-border">
                  <span className="text-[10px] font-mono text-slate-muted uppercase">Baseline Case Projection</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl font-mono font-bold text-silver-bright">{simResult.baseline.projectedCompletionDate}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-muted block mt-1">
                    Risk Score: {simResult.baseline.riskScore} [{simResult.baseline.riskCategory}]
                  </span>
                </div>

                <div className="platinum-card p-4 rounded-xl border border-status-warning/40 bg-status-warning/5">
                  <span className="text-[10px] font-mono text-status-warning uppercase font-bold">Simulated Outcome</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl font-mono font-bold text-silver-bright">{simResult.simulated.projectedCompletionDate}</span>
                    <span className="text-xs font-mono font-bold text-status-critical">
                      +{simResult.delta.delayDaysTotal} Days
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-status-warning block mt-1">
                    Risk Score: {simResult.simulated.riskScore} [{simResult.simulated.riskCategory}] (+{simResult.delta.riskScoreDelta} pts)
                  </span>
                </div>
              </div>

              {/* Newly Blocked Stages & Missed Deadlines Alerts */}
              {(simResult.delta.newlyBlockedStages?.length > 0 || simResult.delta.missedDeadlines?.length > 0) && (
                <div className="p-4 rounded-xl bg-status-critical/10 border border-status-critical/30 space-y-2">
                  <div className="flex items-center gap-2 text-status-critical font-mono font-bold text-xs uppercase">
                    <ShieldAlert size={15} />
                    <span>Predicted Bottlenecks & Blocked Stages</span>
                  </div>
                  {simResult.delta.newlyBlockedStages?.map((stage: string) => (
                    <p key={stage} className="text-xs text-silver">
                      Stage <span className="font-mono font-bold text-status-critical">{stage}</span> is mathematically blocked from starting due to deficient prerequisites.
                    </p>
                  ))}
                  {simResult.delta.missedDeadlines?.map((d: string) => (
                    <p key={d} className="text-xs text-silver">
                      Breach: <span className="font-mono text-status-warning">{d}</span> will breach statutory SLA.
                    </p>
                  ))}
                </div>
              )}

              {/* Visual Branching Timeline Comparison */}
              <div className="platinum-card p-5 rounded-xl border border-graphite-border space-y-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold">
                  Branching Downstream Stage Timeline
                </h4>

                <div className="space-y-3">
                  {simResult.simulated.timeline.map((simNode: any, idx: number) => {
                    const baseNode = simResult.baseline.timeline[idx];
                    return (
                      <div key={simNode.stage} className="p-3 rounded-lg bg-obsidian border border-graphite-border">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-silver-bright">{simNode.stage.replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-muted line-through">{baseNode?.estimatedDate}</span>
                            <ArrowRight size={11} className="text-slate-muted" />
                            <span className="font-bold text-platinum">{simNode.estimatedDate}</span>
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
                <h4 className="text-xs font-mono uppercase tracking-wider text-platinum font-semibold flex items-center gap-2">
                  <Sparkles size={14} className="text-status-success" />
                  <span>Recommended Administrative Interventions</span>
                </h4>
                <div className="space-y-2">
                  {simResult.recommendedInterventions.map((inv: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-obsidian border border-graphite-border text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-silver-bright">{inv.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gunmetal text-platinum">
                          Feasibility: {inv.feasibility}
                        </span>
                      </div>
                      <p className="text-slate-muted">{inv.action}</p>
                      <p className="text-status-success font-mono text-[11px]">Impact: {inv.expectedImpact}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Simulation Assumptions */}
              <div className="p-3 bg-graphite rounded-lg border border-graphite-border text-[11px] font-mono text-slate-muted space-y-1">
                <span className="font-bold uppercase text-platinum">Simulation Assumptions:</span>
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
