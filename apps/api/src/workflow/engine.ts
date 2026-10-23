import prisma from '../lib/prisma.js';
import { recordAuditEvent } from '../audit/recorder.js';
import { evaluateApplicationRisk } from '../risk/calculator.js';
import { AuthUser } from '../middleware/auth.js';

export interface StageDefinition {
  id: string;
  name: string;
  description: string;
  slaDays: number;
  allowedRoles: string[];
  requiredPrerequisites: string[];
}

export interface TransitionRule {
  from: string;
  to: string;
  action: string;
  allowedRoles: string[];
  requiresPrerequisites?: boolean;
  requiresReason?: boolean;
}

export const DEFAULT_WORKFLOW_STAGES: Record<string, StageDefinition> = {
  DRAFT: {
    id: 'DRAFT',
    name: 'Draft Application',
    description: 'Institution preparing initial submission data',
    slaDays: 30,
    allowedRoles: ['INSTITUTION_USER', 'SYSTEM_ADMIN'],
    requiredPrerequisites: [],
  },
  SUBMITTED: {
    id: 'SUBMITTED',
    name: 'Submitted to Regional Office',
    description: 'Application successfully transmitted, awaiting initial scrutiny queue assignment',
    slaDays: 3,
    allowedRoles: ['INSTITUTION_USER', 'REGIONAL_OFFICER', 'SYSTEM_ADMIN'],
    requiredPrerequisites: ['PAYMENT_CONFIRMED', 'AFFIDAVIT_UPLOADED'],
  },
  UNDER_SCRUTINY: {
    id: 'UNDER_SCRUTINY',
    name: 'Under Scrutiny Verification',
    description: 'Regional Scrutiny Committee verifying institutional documents, land records, and affidavits',
    slaDays: 7,
    allowedRoles: ['REGIONAL_OFFICER', 'SYSTEM_ADMIN'],
    requiredPrerequisites: ['LAND_DOCUMENTS_VERIFIED', 'BUILDING_PLAN_VERIFIED'],
  },
  CLARIFICATION_REQUIRED: {
    id: 'CLARIFICATION_REQUIRED',
    name: 'Clarification / Deficiency Raised',
    description: 'Application returned to institution for specific document or data remediation',
    slaDays: 5,
    allowedRoles: ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'SYSTEM_ADMIN'],
    requiredPrerequisites: [],
  },
  RESUBMITTED: {
    id: 'RESUBMITTED',
    name: 'Remediation Resubmitted',
    description: 'Institution replied to raised deficiencies with updated evidence',
    slaDays: 4,
    allowedRoles: ['INSTITUTION_USER', 'SYSTEM_ADMIN'],
    requiredPrerequisites: ['DEFICIENCY_RESPONSE_ATTACHED'],
  },
  EVC_PENDING: {
    id: 'EVC_PENDING',
    name: 'EVC Pending Scheduling',
    description: 'Scrutiny cleared; awaiting constitution and scheduling of Expert Visit Committee',
    slaDays: 10,
    allowedRoles: ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'SYSTEM_ADMIN'],
    requiredPrerequisites: ['SCRUTINY_REPORT_SIGNED'],
  },
  EVC_SCHEDULED: {
    id: 'EVC_SCHEDULED',
    name: 'EVC Scheduled',
    description: 'Expert Visit Committee appointed with confirmed inspection date and venue briefing',
    slaDays: 5,
    allowedRoles: ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'SYSTEM_ADMIN'],
    requiredPrerequisites: ['EVC_PANEL_CONFIRMED', 'INSTITUTION_INTIMATED'],
  },
  EVC_COMPLETED: {
    id: 'EVC_COMPLETED',
    name: 'EVC Inspection Completed',
    description: 'Physical or virtual verification concluded, findings submitted for committee review',
    slaDays: 3,
    allowedRoles: ['COMMITTEE_REVIEWER', 'REGIONAL_OFFICER', 'SYSTEM_ADMIN'],
    requiredPrerequisites: ['EVC_REPORT_UPLOADED', 'GEOTAGGED_PHOTOS_FILED'],
  },
  COMMITTEE_REVIEW: {
    id: 'COMMITTEE_REVIEW',
    name: 'SAC / SHC Review',
    description: 'Standing Appellate / Hearing Committee evaluating comprehensive recommendation',
    slaDays: 5,
    allowedRoles: ['COMMITTEE_REVIEWER', 'BUREAU_OFFICER', 'SYSTEM_ADMIN'],
    requiredPrerequisites: ['EVC_FINDINGS_CONCURRED'],
  },
  AWAITING_DECISION: {
    id: 'AWAITING_DECISION',
    name: 'Awaiting Competent Decision',
    description: 'Final recommendations collated, pending formal AICTE statutory authority sign-off',
    slaDays: 4,
    allowedRoles: ['BUREAU_OFFICER', 'SYSTEM_ADMIN'],
    requiredPrerequisites: ['ALL_RECOMMENDATIONS_SIGNED'],
  },
  APPROVED: {
    id: 'APPROVED',
    name: 'Approved (Letter of Approval / EoA Issued)',
    description: 'Formal approval granted by competent authority',
    slaDays: 0,
    allowedRoles: ['BUREAU_OFFICER', 'SYSTEM_ADMIN'],
    requiredPrerequisites: ['STATUTORY_CHAIRMAN_APPROVAL'],
  },
  REJECTED: {
    id: 'REJECTED',
    name: 'Rejected / Letter of Rejection Issued',
    description: 'Application rejected with comprehensive legal grounds recorded',
    slaDays: 0,
    allowedRoles: ['BUREAU_OFFICER', 'SYSTEM_ADMIN'],
    requiredPrerequisites: ['APPEAL_EXHAUSTED_OR_FINAL_DECISION'],
  },
  CLOSED: {
    id: 'CLOSED',
    name: 'Archived / Closed',
    description: 'Administrative cycle completed',
    slaDays: 0,
    allowedRoles: ['SYSTEM_ADMIN'],
    requiredPrerequisites: [],
  },
};

export const DEFAULT_TRANSITIONS: TransitionRule[] = [
  // Draft to Submit
  { from: 'DRAFT', to: 'SUBMITTED', action: 'SUBMIT_APPLICATION', allowedRoles: ['INSTITUTION_USER', 'SYSTEM_ADMIN'] },
  // Submitted to Scrutiny
  { from: 'SUBMITTED', to: 'UNDER_SCRUTINY', action: 'START_SCRUTINY', allowedRoles: ['REGIONAL_OFFICER', 'SYSTEM_ADMIN'] },
  // Under Scrutiny branches
  { from: 'UNDER_SCRUTINY', to: 'CLARIFICATION_REQUIRED', action: 'RAISE_DEFICIENCY', allowedRoles: ['REGIONAL_OFFICER', 'SYSTEM_ADMIN'], requiresReason: true },
  { from: 'UNDER_SCRUTINY', to: 'EVC_PENDING', action: 'CLEAR_FOR_EVC', allowedRoles: ['REGIONAL_OFFICER', 'SYSTEM_ADMIN'] },
  { from: 'UNDER_SCRUTINY', to: 'AWAITING_DECISION', action: 'SCRUTINY_RECOMMEND_DECISION', allowedRoles: ['REGIONAL_OFFICER', 'SYSTEM_ADMIN'] },
  // Clarification cycle
  { from: 'CLARIFICATION_REQUIRED', to: 'RESUBMITTED', action: 'RESUBMIT_REMEDY', allowedRoles: ['INSTITUTION_USER', 'SYSTEM_ADMIN'] },
  { from: 'RESUBMITTED', to: 'UNDER_SCRUTINY', action: 'RESUME_SCRUTINY', allowedRoles: ['REGIONAL_OFFICER', 'SYSTEM_ADMIN'] },
  // EVC Lifecycle
  { from: 'EVC_PENDING', to: 'EVC_SCHEDULED', action: 'SCHEDULE_EVC', allowedRoles: ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'SYSTEM_ADMIN'], requiresPrerequisites: true },
  { from: 'EVC_SCHEDULED', to: 'EVC_COMPLETED', action: 'SUBMIT_EVC_REPORT', allowedRoles: ['COMMITTEE_REVIEWER', 'REGIONAL_OFFICER', 'SYSTEM_ADMIN'] },
  { from: 'EVC_SCHEDULED', to: 'EVC_PENDING', action: 'RESCHEDULE_EVC', allowedRoles: ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'SYSTEM_ADMIN'], requiresReason: true },
  // Committee / Decision
  { from: 'EVC_COMPLETED', to: 'COMMITTEE_REVIEW', action: 'REFER_TO_COMMITTEE', allowedRoles: ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'SYSTEM_ADMIN'] },
  { from: 'EVC_COMPLETED', to: 'AWAITING_DECISION', action: 'BYPASS_COMMITTEE_TO_DECISION', allowedRoles: ['BUREAU_OFFICER', 'SYSTEM_ADMIN'] },
  { from: 'COMMITTEE_REVIEW', to: 'AWAITING_DECISION', action: 'SUBMIT_COMMITTEE_RECOMMENDATION', allowedRoles: ['COMMITTEE_REVIEWER', 'BUREAU_OFFICER', 'SYSTEM_ADMIN'] },
  // Final Decision (Must be executed by authorised Bureau Officer or Admin)
  { from: 'AWAITING_DECISION', to: 'APPROVED', action: 'GRANT_APPROVAL', allowedRoles: ['BUREAU_OFFICER', 'SYSTEM_ADMIN'] },
  { from: 'AWAITING_DECISION', to: 'REJECTED', action: 'ISSUE_REJECTION', allowedRoles: ['BUREAU_OFFICER', 'SYSTEM_ADMIN'], requiresReason: true },
  // Closure
  { from: 'APPROVED', to: 'CLOSED', action: 'ARCHIVE_CASE', allowedRoles: ['SYSTEM_ADMIN'] },
  { from: 'REJECTED', to: 'CLOSED', action: 'ARCHIVE_CASE', allowedRoles: ['SYSTEM_ADMIN'] },
];

export async function validateAndExecuteTransition(params: {
  applicationId: string;
  targetStage: string;
  action: string;
  actor: AuthUser;
  comments?: string;
  reason?: string;
  prerequisites?: string[];
}) {
  const application = await prisma.application.findUnique({
    where: { id: params.applicationId },
    include: {
      workflowVersion: true,
      complianceObligations: true,
      documentRecords: true,
      evcVisits: true,
    },
  });

  if (!application) {
    throw new Error(`Application ${params.applicationId} not found.`);
  }

  // Load allowed transitions from workflow version or fallback to defaults
  let allowedTransitions: TransitionRule[] = DEFAULT_TRANSITIONS;
  if (application.workflowVersion?.transitionsJson) {
    try {
      allowedTransitions = JSON.parse(application.workflowVersion.transitionsJson);
    } catch (e) {
      // Fallback
    }
  }

  // Find matching transition rule
  const matchedRule = allowedTransitions.find(
    (t) => t.from === application.currentStage && t.to === params.targetStage
  );

  if (!matchedRule) {
    throw new Error(
      `Illegal transition: Cannot move from '${application.currentStage}' to '${params.targetStage}' under active workflow rules.`
    );
  }

  // Check role authorization
  if (!matchedRule.allowedRoles.includes(params.actor.role) && params.actor.role !== 'SYSTEM_ADMIN') {
    throw new Error(
      `Role '${params.actor.role}' is not permitted to execute '${matchedRule.action}' (Permitted: ${matchedRule.allowedRoles.join(', ')})`
    );
  }

  // Check required reason
  if (matchedRule.requiresReason && !params.reason && !params.comments) {
    throw new Error(`A valid recorded reason is mandatory for transition to '${params.targetStage}'.`);
  }

  // Check prerequisites if required
  if (matchedRule.requiresPrerequisites) {
    if (params.targetStage === 'EVC_SCHEDULED') {
      const pendingEvc = application.evcVisits.find((v) => v.status === 'PENDING_SCHEDULE');
      if (pendingEvc && !pendingEvc.prerequisitesSatisfied) {
        throw new Error('EVC Scheduling blocked: Scrutiny clearance and prerequisite documents must be satisfied.');
      }
    }
  }

  const previousStage = application.currentStage;
  const now = new Date();

  // Calculate new deadline based on stage SLA
  const targetDef = DEFAULT_WORKFLOW_STAGES[params.targetStage];
  let newDeadline: Date | null = null;
  if (targetDef && targetDef.slaDays > 0) {
    newDeadline = new Date(now.getTime() + targetDef.slaDays * 24 * 60 * 60 * 1000);
  }

  // Calculate new risk score
  const riskEval = evaluateApplicationRisk({
    currentStage: params.targetStage,
    stageEntryDate: now,
    deadlineDate: newDeadline,
    obligations: application.complianceObligations,
    documents: application.documentRecords,
    evcVisits: application.evcVisits,
    returnReason: params.targetStage === 'CLARIFICATION_REQUIRED' ? (params.reason || params.comments) : null,
  });

  // Execute database updates in transaction
  const [updatedApplication, stageHistory] = await prisma.$transaction([
    prisma.application.update({
      where: { id: application.id },
      data: {
        currentStage: params.targetStage,
        status: params.targetStage === 'APPROVED' ? 'APPROVED' : params.targetStage === 'REJECTED' ? 'REJECTED' : params.targetStage === 'CLARIFICATION_REQUIRED' ? 'ACTION_REQUIRED' : 'IN_PROGRESS',
        stageEntryDate: now,
        deadlineDate: newDeadline,
        returnReason: params.targetStage === 'CLARIFICATION_REQUIRED' ? (params.reason || params.comments) : application.returnReason,
        observations: params.comments ? `${application.observations ? application.observations + '\n---\n' : ''}[${params.actor.role}]: ${params.comments}` : application.observations,
        riskScore: riskEval.score,
        riskCategory: riskEval.category,
        riskFactorsJson: JSON.stringify(riskEval.factors),
      },
    }),
    prisma.stageHistory.create({
      data: {
        applicationId: application.id,
        fromStage: previousStage,
        toStage: params.targetStage,
        actorId: params.actor.id,
        actorRole: params.actor.role,
        action: params.action || matchedRule.action,
        comments: params.comments || params.reason,
        prerequisitesCheck: params.prerequisites ? JSON.stringify(params.prerequisites) : null,
        durationHours: Math.max(0.1, (now.getTime() - application.stageEntryDate.getTime()) / (1000 * 60 * 60)),
      },
    }),
  ]);

  // Record Audit Event
  await recordAuditEvent({
    actor: params.actor,
    actionType: 'STAGE_TRANSITION',
    targetType: 'APPLICATION',
    targetId: application.id,
    previousState: { stage: previousStage, status: application.status },
    newState: { stage: params.targetStage, status: updatedApplication.status, riskScore: riskEval.score },
    reason: params.reason || params.comments || `Executed ${params.action}`,
    ruleVersion: application.workflowVersion?.versionNumber ? `V${application.workflowVersion.versionNumber}` : 'APH-2025-V1',
  });

  return {
    application: updatedApplication,
    stageHistory,
    risk: riskEval,
  };
}
