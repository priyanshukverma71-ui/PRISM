import prisma from '../lib/prisma.js';
import { evaluateApplicationRisk } from '../risk/calculator.js';

export interface SimulationParameters {
  scrutinyDelayDays?: number; // 0, 1, 3, 5, 10
  evcDelayDays?: number; // 0, 2, 5, 7, 14
  missingPrerequisites?: string[]; // e.g. ['FIRE_NOC', 'LAND_LEASE']
  leaseRenewalTiming?: 'ON_TIME' | 'LATE_5_DAYS' | 'LATE_15_DAYS' | 'EXPIRED';
  delayedEvidenceDays?: number; // 0 to 20
  workloadPressureMultiplier?: number; // 1.0 (normal) to 2.5 (backlogged)
  interventionScenario?: 'NONE' | 'FAST_TRACK_EVC' | 'SPECIAL_SCRUTINY_DRIVE' | 'PROVISIONAL_UNDERTAKING';
}

export interface SimulationResult {
  disclaimer: string;
  applicationId: string;
  applicationNumber: string;
  baseline: {
    stage: string;
    riskScore: number;
    riskCategory: string;
    projectedCompletionDate: string;
    activeBlockers: string[];
    timeline: Array<{ stage: string; estimatedDate: string; isBottleneck: boolean }>;
  };
  simulated: {
    stage: string;
    riskScore: number;
    riskCategory: string;
    projectedCompletionDate: string;
    activeBlockers: string[];
    missedDeadlinesCount: number;
    timeline: Array<{ stage: string; estimatedDate: string; isBottleneck: boolean; delayDays: number }>;
  };
  delta: {
    delayDaysTotal: number;
    riskScoreDelta: number;
    newlyBlockedStages: string[];
    missedDeadlines: string[];
  };
  recommendedInterventions: Array<{
    title: string;
    action: string;
    expectedImpact: string;
    feasibility: 'HIGH' | 'MEDIUM' | 'EXCEPTIONAL';
  }>;
  assumptions: string[];
}

export async function runCounterfactualSimulation(
  applicationId: string,
  params: SimulationParameters
): Promise<SimulationResult> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      workflowTemplate: true,
      workflowVersion: true,
      complianceObligations: true,
      documentRecords: true,
      evcVisits: true,
    },
  });

  if (!application) {
    throw new Error(`Application ${applicationId} not found`);
  }

  const now = new Date();
  const scrutinyDelay = params.scrutinyDelayDays || 0;
  const evcDelay = params.evcDelayDays || 0;
  const missingPrereqs = params.missingPrerequisites || [];
  const workloadMultiplier = params.workloadPressureMultiplier || 1.0;
  const intervention = params.interventionScenario || 'NONE';

  // 1. Calculate Baseline Timeline
  const baselineTimeline = [
    { stage: 'UNDER_SCRUTINY', days: 7 },
    { stage: 'EVC_PENDING', days: 5 },
    { stage: 'EVC_SCHEDULED', days: 4 },
    { stage: 'COMMITTEE_REVIEW', days: 5 },
    { stage: 'AWAITING_DECISION', days: 3 },
  ];

  let cumulativeDays = 0;
  const baselineMilestones = baselineTimeline.map((item) => {
    cumulativeDays += item.days;
    const estDate = new Date(now.getTime() + cumulativeDays * 24 * 60 * 60 * 1000);
    return {
      stage: item.stage,
      estimatedDate: estDate.toISOString().split('T')[0],
      isBottleneck: item.days > 5,
    };
  });
  const baselineCompletion = baselineMilestones[baselineMilestones.length - 1].estimatedDate;

  // 2. Compute Simulated Timeline & Downstream Delays
  let simulatedCumulativeDays = 0;
  const missedDeadlines: string[] = [];
  const newlyBlockedStages: string[] = [];
  const simulatedMilestones = [];

  for (const item of baselineTimeline) {
    let stageDelay = 0;

    if (item.stage === 'UNDER_SCRUTINY') {
      stageDelay += scrutinyDelay;
      if (missingPrereqs.includes('LAND_LEASE') || missingPrereqs.includes('BUILDING_PLAN')) {
        stageDelay += 8;
        newlyBlockedStages.push('UNDER_SCRUTINY');
        missedDeadlines.push('Scrutiny Document Clearance Threshold');
      }
    }

    if (item.stage === 'EVC_PENDING' || item.stage === 'EVC_SCHEDULED') {
      stageDelay += evcDelay;
      if (missingPrereqs.includes('FIRE_NOC')) {
        stageDelay += 12;
        newlyBlockedStages.push('EVC_SCHEDULED');
        missedDeadlines.push('EVC Inspection Window Deadline');
      }
    }

    // Workload impact
    const workloadAdditional = Math.round(item.days * (workloadMultiplier - 1.0));
    stageDelay += workloadAdditional;

    // Apply potential intervention relief
    if (intervention === 'FAST_TRACK_EVC' && (item.stage === 'EVC_PENDING' || item.stage === 'EVC_SCHEDULED')) {
      stageDelay = Math.max(0, stageDelay - 6);
    } else if (intervention === 'SPECIAL_SCRUTINY_DRIVE' && item.stage === 'UNDER_SCRUTINY') {
      stageDelay = Math.max(0, stageDelay - 4);
    } else if (intervention === 'PROVISIONAL_UNDERTAKING' && missingPrereqs.length > 0) {
      stageDelay = Math.max(0, stageDelay - 5);
    }

    const effectiveDays = Math.max(1, item.days + stageDelay);
    simulatedCumulativeDays += effectiveDays;

    const simDate = new Date(now.getTime() + simulatedCumulativeDays * 24 * 60 * 60 * 1000);
    simulatedMilestones.push({
      stage: item.stage,
      estimatedDate: simDate.toISOString().split('T')[0],
      isBottleneck: effectiveDays > item.days + 3,
      delayDays: stageDelay,
    });
  }

  // 3. Simulated Risk Evaluation
  let simulatedRiskScore = application.riskScore + (scrutinyDelay * 2.5) + (evcDelay * 3.0) + (missingPrereqs.length * 15);
  if (params.leaseRenewalTiming === 'LATE_5_DAYS') simulatedRiskScore += 18;
  if (params.leaseRenewalTiming === 'LATE_15_DAYS') simulatedRiskScore += 30;
  if (params.leaseRenewalTiming === 'EXPIRED') simulatedRiskScore += 45;

  if (intervention === 'FAST_TRACK_EVC') simulatedRiskScore -= 20;
  if (intervention === 'SPECIAL_SCRUTINY_DRIVE') simulatedRiskScore -= 15;
  if (intervention === 'PROVISIONAL_UNDERTAKING') simulatedRiskScore -= 18;

  simulatedRiskScore = Math.min(100, Math.max(5, Math.round(simulatedRiskScore)));

  let simulatedRiskCat: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (simulatedRiskScore >= 80) simulatedRiskCat = 'CRITICAL';
  else if (simulatedRiskScore >= 55) simulatedRiskCat = 'HIGH';
  else if (simulatedRiskScore >= 25) simulatedRiskCat = 'MEDIUM';

  // 4. Generate Explainable Interventions
  const recommendedInterventions = [];
  if (scrutinyDelay > 3 || missingPrereqs.length > 0) {
    recommendedInterventions.push({
      title: 'Issue Targeted Deficiency Notice (48h Cure Window)',
      action: 'Trigger urgent in-app communication requesting specific missing prerequisites before EVC freeze',
      expectedImpact: 'Prevents automatic EVC cancellation; recovers 5-7 calendar days',
      feasibility: 'HIGH' as const,
    });
  }
  if (evcDelay > 4 || newlyBlockedStages.includes('EVC_SCHEDULED')) {
    recommendedInterventions.push({
      title: 'Regional Standing Committee Fast-Track Roster',
      action: 'Assign backup inspection experts from Central Pool to bypass regional panel constraints',
      expectedImpact: 'Compresses EVC scheduling window by 6 calendar days',
      feasibility: 'MEDIUM' as const,
    });
  }
  if (params.leaseRenewalTiming === 'EXPIRED' || params.leaseRenewalTiming === 'LATE_15_DAYS') {
    recommendedInterventions.push({
      title: 'Provisional Undertaking with Bank Guarantee Escrow',
      action: 'Accept registered indemnity bond with 30-day registered lease production covenant',
      expectedImpact: 'Maintains approval cycle validity while preserving legal compliance',
      feasibility: 'EXCEPTIONAL' as const,
    });
  }

  // Assumptions
  const assumptions = [
    'Model operates on isolated snapshot data; live production records remain unmutated',
    'Stage SLAs based on standard AICTE Approval Process Handbook (APH) 2025-26 benchmarks',
    'Downstream dependencies assume linear sequence without parallel committee fast-tracks',
    `Workload pressure factor modeled at ${workloadMultiplier.toFixed(1)}x baseline operational load`,
  ];

  return {
    disclaimer: 'SIMULATION — NOT AN OFFICIAL DECISION. For operational forecasting and scenario planning only.',
    applicationId: application.id,
    applicationNumber: application.applicationNumber,
    baseline: {
      stage: application.currentStage,
      riskScore: application.riskScore,
      riskCategory: application.riskCategory,
      projectedCompletionDate: baselineCompletion,
      activeBlockers: [],
      timeline: baselineMilestones,
    },
    simulated: {
      stage: application.currentStage,
      riskScore: simulatedRiskScore,
      riskCategory: simulatedRiskCat,
      projectedCompletionDate: simulatedMilestones[simulatedMilestones.length - 1].estimatedDate,
      activeBlockers: newlyBlockedStages,
      missedDeadlinesCount: missedDeadlines.length,
      timeline: simulatedMilestones,
    },
    delta: {
      delayDaysTotal: simulatedCumulativeDays - cumulativeDays,
      riskScoreDelta: simulatedRiskScore - application.riskScore,
      newlyBlockedStages,
      missedDeadlines,
    },
    recommendedInterventions,
    assumptions,
  };
}
