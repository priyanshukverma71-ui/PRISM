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
  ChevronDown,
  Sliders,
  Clock,
  FileX,
  Users,
  Zap,
  CheckCircle2,
  Calendar,
  LucideIcon,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { formatPlainStage, formatSeverity, safeFormatError } from '../lib/plainLanguage.js';
import { useToast } from '../context/ToastContext.js';
import { LoadingState } from '../components/common/LoadingState.js';

interface PredefinedScenario {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  scrutinyDelayDays: number;
  evcDelayDays: number;
  missingPrereqs: string[];
  leaseTiming: 'ON_TIME' | 'LATE_5_DAYS' | 'LATE_15_DAYS' | 'EXPIRED';
  workloadMultiplier: number;
  intervention: 'NONE' | 'FAST_TRACK_EVC' | 'SPECIAL_SCRUTINY_DRIVE' | 'PROVISIONAL_UNDERTAKING';
}

const PREDEFINED_SCENARIOS: PredefinedScenario[] = [
  {
    id: 'delayed_verification',
    name: 'Delayed verification',
    description: 'High scrutiny review volume delays initial verification by 12 days',
    icon: Clock,
    scrutinyDelayDays: 12,
    evcDelayDays: 2,
    missingPrereqs: [],
    leaseTiming: 'ON_TIME',
    workloadMultiplier: 1.8,
    intervention: 'NONE',
  },
  {
    id: 'missing_evidence',
    name: 'Missing evidence',
    description: 'Fire safety clearance and building stability proof are missing',
    icon: FileX,
    scrutinyDelayDays: 5,
    evcDelayDays: 6,
    missingPrereqs: ['FIRE_NOC', 'STRUCTURAL_CERT'],
    leaseTiming: 'ON_TIME',
    workloadMultiplier: 1.2,
    intervention: 'NONE',
  },
  {
    id: 'inspection_bottleneck',
    name: 'Inspection bottleneck',
    description: 'Inspection committee shortage (+14 days) combined with late lease deed',
    icon: Users,
    scrutinyDelayDays: 3,
    evcDelayDays: 14,
    missingPrereqs: ['LAND_LEASE'],
    leaseTiming: 'LATE_15_DAYS',
    workloadMultiplier: 2.0,
    intervention: 'FAST_TRACK_EVC',
  },
  {
    id: 'mitigation_drive',
    name: 'Provisional mitigation',
    description: 'Accept escrow undertaking with accelerated scrutiny drive',
    icon: Zap,
    scrutinyDelayDays: 8,
    evcDelayDays: 4,
    missingPrereqs: ['FIRE_NOC'],
    leaseTiming: 'LATE_5_DAYS',
    workloadMultiplier: 1.4,
    intervention: 'PROVISIONAL_UNDERTAKING',
  },
];

export function FutureLabPage() {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const defaultAppId = searchParams.get('appId') || '';

  const [selectedAppId, setSelectedAppId] = useState<string>(defaultAppId);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('delayed_verification');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Parameter states
  const [scrutinyDelayDays, setScrutinyDelayDays] = useState<number>(12);
  const [evcDelayDays, setEvcDelayDays] = useState<number>(2);
  const [missingPrereqs, setMissingPrereqs] = useState<string[]>([]);
  const [leaseTiming, setLeaseTiming] = useState<'ON_TIME' | 'LATE_5_DAYS' | 'LATE_15_DAYS' | 'EXPIRED'>('ON_TIME');
  const [workloadMultiplier, setWorkloadMultiplier] = useState<number>(1.8);
  const [intervention, setIntervention] = useState<'NONE' | 'FAST_TRACK_EVC' | 'SPECIAL_SCRUTINY_DRIVE' | 'PROVISIONAL_UNDERTAKING'>('NONE');

  // Load applications list for selector
  const { data: applications, isLoading: isAppsLoading } = useQuery({
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
    onSuccess: () => {
      showToast({
        type: 'success',
        title: 'Simulation complete',
        message: 'Projected counterfactual timeline and risk shifts calculated.',
      });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: "We couldn't run the simulation",
        message: safeFormatError(err, 'Try adjusting parameters and run again.'),
      });
    },
  });

  const handleApplyScenario = (scenario: PredefinedScenario) => {
    setActiveScenarioId(scenario.id);
    setScrutinyDelayDays(scenario.scrutinyDelayDays);
    setEvcDelayDays(scenario.evcDelayDays);
    setMissingPrereqs(scenario.missingPrereqs);
    setLeaseTiming(scenario.leaseTiming);
    setWorkloadMultiplier(scenario.workloadMultiplier);
    setIntervention(scenario.intervention);
  };

  const handleRunSimulation = () => {
    if (!selectedAppId) {
      showToast({
        type: 'warning',
        title: 'Select an application',
        message: 'Please choose a target application dossier to simulate.',
      });
      return;
    }

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
    setActiveScenarioId('custom');
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
              Explore how verification holds, missing statutory evidence, or committee delays impact approval deadlines on an isolated snapshot.
              Official regulatory records are never altered.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg border border-graphite-border bg-graphite text-xs text-slate-muted">
              Isolated virtual snapshot
            </span>
          </div>
        </div>

        {/* Required Plain Language Disclaimer */}
        <div className="mt-4 p-2.5 rounded-lg bg-obsidian border border-graphite-border text-xs text-platinum flex items-center gap-2">
          <Info size={14} className="text-status-warning flex-shrink-0" />
          <span>Notice: This is a what-if simulation — not an official regulatory determination. Used for risk forecasting and scenario planning only.</span>
        </div>
      </div>

      {/* Main Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Scenario Controls */}
        <div className="lg:col-span-5 platinum-card p-5 rounded-2xl border border-graphite-border space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-graphite-border">
            <h3 className="text-xs uppercase tracking-wider text-platinum font-semibold">
              Scenario setup
            </h3>
            <span className="text-[10px] text-slate-muted">Step 1 of 2</span>
          </div>

          {/* Target Application Dossier */}
          <div>
            <label className="block text-xs font-semibold text-silver mb-1.5">Target application dossier</label>
            {isAppsLoading ? (
              <div className="h-9 rounded-lg bg-obsidian border border-graphite-border animate-pulse" />
            ) : (
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                aria-label="Target application dossier"
                className="w-full bg-obsidian border border-graphite-border rounded-lg p-2.5 text-xs text-silver focus:outline-none focus:border-platinum cursor-pointer"
              >
                {applications?.map((app: any) => (
                  <option key={app.id} value={app.id}>
                    {app.applicationNumber} — {app.institution?.name?.slice(0, 30)}... [{formatPlainStage(app.currentStage)}]
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Predefined Scenarios (Requested: Start with predefined scenarios) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-silver">
              Choose a predefined scenario
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PREDEFINED_SCENARIOS.map((sc) => {
                const isSelected = activeScenarioId === sc.id;
                const IconComponent = sc.icon;

                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => handleApplyScenario(sc)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                      isSelected
                        ? 'bg-platinum/10 border-platinum/60 shadow-sm'
                        : 'bg-obsidian border-graphite-border hover:border-graphite-hover hover:bg-graphite/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-silver-bright flex items-center gap-1.5">
                        <IconComponent size={13} className={isSelected ? 'text-platinum' : 'text-slate-muted'} />
                        {sc.name}
                      </span>
                      {isSelected && <CheckCircle2 size={13} className="text-status-success" />}
                    </div>
                    <p className="text-[10px] text-slate-muted line-clamp-2 leading-relaxed">
                      {sc.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expandable Advanced Settings (Requested: Put advanced settings behind an expandable section) */}
          <div className="border border-graphite-border rounded-xl overflow-hidden bg-obsidian">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-3 flex items-center justify-between text-xs font-semibold text-silver hover:text-white transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sliders size={13} className="text-platinum" />
                <span>Advanced parameter customization</span>
              </span>
              <ChevronDown
                size={14}
                className={`transform transition-transform text-slate-muted ${showAdvanced ? 'rotate-180' : ''}`}
              />
            </button>

            {showAdvanced && (
              <div className="p-4 pt-2 border-t border-graphite-border space-y-4 animate-in fade-in duration-200">
                {/* Scrutiny Hold Days */}
                <div>
                  <div className="flex justify-between text-xs text-silver mb-1">
                    <span>Review delay duration</span>
                    <span className="font-semibold text-silver-bright">{scrutinyDelayDays} days</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={scrutinyDelayDays}
                    onChange={(e) => {
                      setActiveScenarioId('custom');
                      setScrutinyDelayDays(parseInt(e.target.value, 10));
                    }}
                    className="w-full accent-platinum cursor-pointer"
                  />
                </div>

                {/* EVC Scheduling Delay Days */}
                <div>
                  <div className="flex justify-between text-xs text-silver mb-1">
                    <span>Inspection scheduling delay</span>
                    <span className="font-semibold text-silver-bright">{evcDelayDays} days</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={evcDelayDays}
                    onChange={(e) => {
                      setActiveScenarioId('custom');
                      setEvcDelayDays(parseInt(e.target.value, 10));
                    }}
                    className="w-full accent-platinum cursor-pointer"
                  />
                </div>

                {/* Missing Prerequisites */}
                <div>
                  <label className="block text-xs font-medium text-silver mb-1.5">Missing prerequisites</label>
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
                              : 'bg-gunmetal/40 text-slate-muted border-graphite-border hover:text-silver'
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
                  <label className="block text-xs font-medium text-silver mb-1.5">Lease submission timing</label>
                  <select
                    value={leaseTiming}
                    onChange={(e: any) => {
                      setActiveScenarioId('custom');
                      setLeaseTiming(e.target.value);
                    }}
                    className="w-full bg-gunmetal/50 border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none cursor-pointer"
                  >
                    <option value="ON_TIME">Submitted on time (&gt; 30 days before expiry)</option>
                    <option value="LATE_5_DAYS">Submitted 5 days late (within grace period)</option>
                    <option value="LATE_15_DAYS">Submitted 15 days late (high urgency)</option>
                    <option value="EXPIRED">Unrenewed / Expired land lease deed</option>
                  </select>
                </div>

                {/* Workload Pressure */}
                <div>
                  <div className="flex justify-between text-xs text-silver mb-1">
                    <span>Regional review workload pressure</span>
                    <span className="font-semibold text-silver-bright">{workloadMultiplier.toFixed(1)}x normal volume</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.5"
                    step="0.1"
                    value={workloadMultiplier}
                    onChange={(e) => {
                      setActiveScenarioId('custom');
                      setWorkloadMultiplier(parseFloat(e.target.value));
                    }}
                    className="w-full accent-platinum cursor-pointer"
                  />
                </div>

                {/* Simulated Administrative Action */}
                <div>
                  <label className="block text-xs font-medium text-silver mb-1.5">Simulated administrative action</label>
                  <select
                    value={intervention}
                    onChange={(e: any) => {
                      setActiveScenarioId('custom');
                      setIntervention(e.target.value);
                    }}
                    className="w-full bg-gunmetal/50 border border-graphite-border rounded-lg p-2 text-xs text-silver focus:outline-none cursor-pointer"
                  >
                    <option value="NONE">None (Standard regulatory timeline)</option>
                    <option value="FAST_TRACK_EVC">Central inspection pool (-6 days)</option>
                    <option value="SPECIAL_SCRUTINY_DRIVE">Accelerated review drive (-4 days)</option>
                    <option value="PROVISIONAL_UNDERTAKING">Accept provisional undertaking with escrow</option>
                  </select>
                </div>
              </div>
            )}
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

        {/* Right Column: Counterfactual Visualizer & Timeline Comparison */}
        <div className="lg:col-span-7 space-y-5">
          {!simResult ? (
            <div className="platinum-card p-12 rounded-2xl border border-graphite-border text-center flex flex-col items-center justify-center min-h-[460px]">
              <div className="w-16 h-16 rounded-2xl bg-gunmetal flex items-center justify-center border border-graphite-border text-platinum mb-4">
                <FlaskConical size={28} />
              </div>
              <h3 className="text-base font-semibold text-silver-bright">Ready to run simulation</h3>
              <p className="text-xs text-slate-muted max-w-sm mt-1 leading-relaxed">
                Select a predefined scenario on the left or customize parameters, then click Run simulation to observe projected delays, bottlenecks, and timeline deviations.
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
                <span className="text-platinum text-[11px] font-semibold">Simulated projection</span>
              </div>

              {/* Comparative Outcome Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="platinum-card p-4 rounded-xl border border-graphite-border">
                  <span className="text-[10px] text-slate-muted uppercase font-semibold">Original completion date</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl font-bold font-mono text-silver-bright">{simResult.baseline.projectedCompletionDate}</span>
                  </div>
                  <span className="text-[11px] text-slate-muted block mt-1">
                    Risk score: {simResult.baseline.riskScore} • {formatSeverity(simResult.baseline.riskCategory)}
                  </span>
                </div>

                <div className="platinum-card p-4 rounded-xl border border-status-warning/40 bg-status-warning/5">
                  <span className="text-[10px] text-status-warning uppercase font-semibold">Projected completion date</span>
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

              {/* Predicted Bottlenecks & Blocked Stages */}
              {(simResult.delta.newlyBlockedStages?.length > 0 || simResult.delta.missedDeadlines?.length > 0) && (
                <div className="p-4 rounded-xl bg-status-critical/10 border border-status-critical/30 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-status-critical font-semibold">
                    <ShieldAlert size={15} />
                    <span>Predicted bottlenecks and blocked stages</span>
                  </div>
                  {simResult.delta.newlyBlockedStages?.map((stage: string) => (
                    <p key={stage} className="text-silver">
                      Stage <span className="font-semibold text-status-critical">{formatPlainStage(stage)}</span> is blocked from starting due to missing prerequisites.
                    </p>
                  ))}
                  {simResult.delta.missedDeadlines?.map((d: string) => (
                    <p key={d} className="text-silver">
                      Deadline risk: <span className="font-medium text-status-warning">{d}</span> will breach the statutory timeframe.
                    </p>
                  ))}
                </div>
              )}

              {/* SIDE-BY-SIDE TIMELINE COMPARISON (Requested: Show original timeline beside projected timeline) */}
              <div className="platinum-card p-5 rounded-2xl border border-graphite-border space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-graphite-border gap-2">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-platinum font-semibold">
                      Timeline comparison: Original vs Projected
                    </h4>
                    <p className="text-xs text-slate-muted mt-0.5">
                      Stage-by-stage projection showing the original schedule beside simulated delays.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-muted">
                      <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                      Original
                    </span>
                    <span className="flex items-center gap-1.5 text-status-warning font-medium">
                      <span className="w-2 h-2 rounded-full bg-status-warning"></span>
                      Projected
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Original Timeline */}
                  <div className="space-y-2 p-3.5 rounded-xl bg-obsidian border border-graphite-border">
                    <div className="flex items-center justify-between pb-2 border-b border-graphite-border text-xs">
                      <span className="font-semibold text-silver flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-muted" />
                        <span>Original timeline</span>
                      </span>
                      <span className="font-mono text-slate-muted text-[11px]">
                        Target: {simResult.baseline.projectedCompletionDate}
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      {simResult.baseline.timeline.map((baseNode: any) => (
                        <div
                          key={baseNode.stage}
                          className="p-2.5 rounded-lg bg-graphite/40 border border-graphite-border flex items-center justify-between text-xs"
                        >
                          <span className="font-medium text-silver">
                            {formatPlainStage(baseNode.stage)}
                          </span>
                          <span className="font-mono text-slate-muted text-[11px]">
                            {baseNode.estimatedDate}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Projected Timeline */}
                  <div className="space-y-2 p-3.5 rounded-xl bg-status-warning/5 border border-status-warning/30">
                    <div className="flex items-center justify-between pb-2 border-b border-status-warning/20 text-xs">
                      <span className="font-semibold text-status-warning flex items-center gap-1.5">
                        <FlaskConical size={12} className="text-status-warning" />
                        <span>Projected timeline</span>
                      </span>
                      <span className="font-mono font-bold text-silver-bright text-[11px]">
                        {simResult.simulated.projectedCompletionDate}
                        <span className="text-status-critical ml-1 font-sans">
                          (+{simResult.delta.delayDaysTotal}d)
                        </span>
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      {simResult.simulated.timeline.map((simNode: any) => {
                        const isBlocked = simResult.delta.newlyBlockedStages?.includes(simNode.stage);

                        return (
                          <div
                            key={simNode.stage}
                            className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                              isBlocked
                                ? 'bg-status-critical/15 border-status-critical/40 text-status-critical'
                                : simNode.delayDays > 0
                                ? 'bg-obsidian border-status-warning/30 text-silver-bright'
                                : 'bg-obsidian border-graphite-border text-silver'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{formatPlainStage(simNode.stage)}</span>
                              {isBlocked && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-status-critical/30 text-status-critical uppercase">
                                  Blocked
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span>{simNode.estimatedDate}</span>
                              {simNode.delayDays > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-status-critical/20 text-status-critical border border-status-critical/40">
                                  +{simNode.delayDays}d
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
