/**
 * Plain Language Utilities for PRISM
 * Enterprise plain-language dictionaries and label mappings.
 * Eliminates underscores, raw database keys, and technical identifiers from all visible UI text.
 */

/**
 * Robust fallback that safely converts snake_case or SCREAMING_SNAKE_CASE
 * into clean, natural Sentence case.
 */
export function toSentenceCase(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  const cleaned = text
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (!cleaned) return '';
  const lower = cleaned.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Universal display label dictionary for known statuses, fields, and identifiers.
 */
const DISPLAY_LABELS: Record<string, string> = {
  // Required Priority 1 examples
  application_status: 'Application status',
  risk_score: 'Risk score',
  missing_documents: 'Missing documents',
  pending_review: 'Waiting for review',
  workflow_progress: 'Application progress',
  last_updated: 'Last updated',
  evidence_verification: 'Document verification',
  futurelab_simulation: 'What-if simulation',

  // Stages & Statuses
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted — waiting for review',
  UNDER_SCRUTINY: 'Under review',
  CLARIFICATION_REQUIRED: 'Action required — clarification needed',
  RESUBMITTED: 'Resubmitted — waiting for review',
  EVC_PENDING: 'Inspection pending',
  EVC_SCHEDULED: 'Inspection scheduled',
  EVC_COMPLETED: 'Inspection completed',
  COMMITTEE_REVIEW: 'Under committee review',
  AWAITING_DECISION: 'Awaiting final decision',
  AWAITING_AUTHORISED_DECISION: 'Awaiting final decision',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
  PENDING: 'Pending submission',
  PENDING_VERIFICATION: 'Waiting for review',
  PENDING_SCHEDULE: 'Waiting to be scheduled',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  PENDING_ACTION: 'Action required',
  ACTION_REQUIRED: 'Action required',
  RETURNED: 'Returned for clarification',
  COMPLETED: 'Completed',
  VERIFIED: 'Verified & compliant',
  DEFICIENT: 'Clarification needed',
  EXPIRED: 'Expired',
  UNRESOLVED: 'Action needed',
  RESOLVED: 'Resolved',
  ACTIVE: 'Active',
  DISABLED: 'Disabled',

  // Severities
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  WARNING: 'Warning',

  // Application Categories
  EXTENSION_OF_APPROVAL: 'Extension of approval',
  NEW_INSTITUTION: 'New institution',
  INTAKE_INCREASE: 'Intake increase',
  NEW_COURSE: 'New course',
  FULL_CYCLE: 'Standard review cycle',
  ONLY_SCRUTINY: 'Accelerated review cycle',

  // Compliance Categories & Document Types
  LAND_BUILDING: 'Land and building',
  SAFETY_NOC: 'Safety clearance',
  FACULTY_CADRE: 'Faculty cadre and salary',
  AFFILIATION: 'University affiliation',
  LEASE_AGREEMENT: 'Land lease agreement',
  BUILDING_STABILITY: 'Building stability certificate',
  FIRE_SAFETY_CERTIFICATE: 'Fire safety certificate',
  NOC_STATE_GOVT: 'State government clearance',

  // Roles
  SYSTEM_ADMIN: 'System administrator',
  REGIONAL_OFFICER: 'Regional officer',
  BUREAU_OFFICER: 'Bureau officer',
  COMMITTEE_REVIEWER: 'Committee reviewer',
  INSTITUTION_USER: 'Institution user',
  AUDITOR: 'Auditor',

  // Action & Event Types
  USER_LOGIN: 'User login',
  APPLICATION_CREATE: 'Application created',
  STAGE_TRANSITION: 'Stage updated',
  COMPLIANCE_VERIFIED: 'Document verified',
  EVC_UPDATED: 'Inspection schedule updated',
  ALERT_GENERATED: 'Alert issued',
  SIMULATION_RUN: 'Simulation executed',

  // Entity Targets
  APPLICATION: 'Application',
  COMPLIANCE: 'Compliance requirement',
  EVC: 'Inspection committee',
  ALERT: 'Alert',
  WORKFLOW_RULE: 'Workflow rule',
  DOCUMENT: 'Document',

  // Simulation & Interventions
  NONE: 'Standard timeline',
  FAST_TRACK_EVC: 'Central inspection pool',
  SPECIAL_SCRUTINY_DRIVE: 'Accelerated review drive',
  PROVISIONAL_UNDERTAKING: 'Provisional undertaking with escrow',
  ON_TIME: 'On time',
  LATE_5_DAYS: '5 days late',
  LATE_15_DAYS: '15 days late',
};

/**
 * Type-safe display-label mapping with safe human-readable fallback
 */
export function formatDisplayLabel(key?: string | null): string {
  if (!key || typeof key !== 'string') return '';
  if (DISPLAY_LABELS[key]) {
    return DISPLAY_LABELS[key];
  }
  return toSentenceCase(key);
}

export function formatRole(role?: string | null): string {
  return formatDisplayLabel(role);
}

export function formatCategory(category?: string | null): string {
  return formatDisplayLabel(category);
}

export function formatStatus(status?: string | null): string {
  return formatDisplayLabel(status);
}

export function formatSeverity(severity?: string | null): string {
  return formatDisplayLabel(severity);
}

export function formatActionType(actionType?: string | null): string {
  return formatDisplayLabel(actionType);
}

export function formatEntityType(entityType?: string | null): string {
  return formatDisplayLabel(entityType);
}

export function formatDocumentType(docType?: string | null): string {
  return formatDisplayLabel(docType);
}

export function formatIntervention(intervention?: string | null): string {
  return formatDisplayLabel(intervention);
}

/**
 * Converts technical workflow stage enums into plain-language status
 */
export function formatPlainStage(stage?: string | null): string {
  if (!stage) return 'In review';
  return formatDisplayLabel(stage);
}

/**
 * Resolves the primary person, officer, or statutory authority responsible
 * for the application's current stage.
 */
export function getApplicationOwner(app?: any): { name: string; role?: string } {
  if (!app) return { name: 'Assigned review officer' };

  // 1. Direct active officer assignment
  const activeAssignment = Array.isArray(app.assignments)
    ? app.assignments.find((a: any) => a?.status === 'ACTIVE') || app.assignments[0]
    : null;

  if (activeAssignment?.assignedTo?.name) {
    return {
      name: activeAssignment.assignedTo.name,
      role: activeAssignment.assignedTo.role ? formatRole(activeAssignment.assignedTo.role) : undefined,
    };
  }

  // 2. Stage-based statutory/operational owner
  switch (app.currentStage) {
    case 'DRAFT':
      return {
        name: app.institution?.name ? `${app.institution.name} leadership` : 'Institution applicant',
        role: 'Applicant',
      };
    case 'SUBMITTED':
    case 'UNDER_SCRUTINY':
    case 'RESUBMITTED':
      return {
        name: 'Regional review officer',
        role: `${app.region || 'Regional'} bureau`,
      };
    case 'CLARIFICATION_REQUIRED':
      return {
        name: app.institution?.name ? `${app.institution.name} applicant` : 'Institution applicant',
        role: 'Pending clarification',
      };
    case 'EVC_PENDING':
      return {
        name: 'Zonal bureau lead',
        role: 'Inspection coordinator',
      };
    case 'EVC_SCHEDULED':
      return {
        name: 'Inspection committee lead',
        role: '3-member expert panel',
      };
    case 'EVC_COMPLETED':
      return {
        name: 'Regional directorate',
        role: 'Post-inspection evaluation',
      };
    case 'COMMITTEE_REVIEW':
      return {
        name: 'Standing committee panel',
        role: 'Headquarters review',
      };
    case 'AWAITING_DECISION':
      return {
        name: 'Competent authority',
        role: 'Approval council',
      };
    case 'APPROVED':
    case 'REJECTED':
    case 'CLOSED':
      return {
        name: 'Concluded',
        role: 'Record archived',
      };
    default:
      return {
        name: 'Assigned review officer',
      };
  }
}

/**
 * Calculates human-understandable relative days remaining
 */
export function formatDaysRemaining(targetDate?: string | Date | null): {
  text: string;
  days: number;
  isOverdue: boolean;
  isAtRisk: boolean;
  isDueSoon: boolean;
} {
  if (!targetDate) {
    return { text: 'No fixed deadline', days: 999, isOverdue: false, isAtRisk: false, isDueSoon: false };
  }

  const now = Date.now();
  const target = new Date(targetDate).getTime();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`,
      days: diffDays,
      isOverdue: true,
      isAtRisk: true,
      isDueSoon: false,
    };
  }

  if (diffDays === 0) {
    return {
      text: 'At risk — Due today',
      days: 0,
      isOverdue: false,
      isAtRisk: true,
      isDueSoon: true,
    };
  }

  if (diffDays <= 3) {
    return {
      text: `At risk — ${diffDays} day${diffDays === 1 ? '' : 's'} remaining`,
      days: diffDays,
      isOverdue: false,
      isAtRisk: true,
      isDueSoon: true,
    };
  }

  if (diffDays <= 7) {
    return {
      text: `Due soon — ${diffDays} days remaining`,
      days: diffDays,
      isOverdue: false,
      isAtRisk: false,
      isDueSoon: true,
    };
  }

  return {
    text: `${diffDays} days remaining`,
    days: diffDays,
    isOverdue: false,
    isAtRisk: false,
    isDueSoon: false,
  };
}

/**
 * Formats compliance obligation status into plain language with explicit "Next action:"
 */
export function formatPlainComplianceStatus(
  status?: string | null,
  dueDate?: string | Date | null
): {
  label: string;
  badgeStyle: string;
  nextAction: string;
} {
  const timing = formatDaysRemaining(dueDate);

  switch (status) {
    case 'VERIFIED':
      return {
        label: 'Verified & compliant',
        badgeStyle: 'bg-status-success/15 text-status-success border-status-success/30',
        nextAction: 'Next action: Compliant. No further action needed.',
      };

    case 'DEFICIENT':
      return {
        label: 'Action required — deficiency reported',
        badgeStyle: 'bg-status-critical/15 text-status-critical border-status-critical/30',
        nextAction: 'Next action: Upload the missing evidence to rectify deficiency',
      };

    case 'EXPIRED':
      return {
        label: `Expired — ${timing.text}`,
        badgeStyle: 'bg-status-critical/20 text-status-critical border-status-critical/40',
        nextAction: 'Next action: Submit renewed statutory certificate immediately',
      };

    case 'SUBMITTED':
      return {
        label: 'Waiting for document verification',
        badgeStyle: 'bg-blue-950/60 text-blue-300 border-blue-800',
        nextAction: 'Next action: Regional officer to inspect evidence against statutory checklist',
      };

    case 'PENDING':
    default:
      if (timing.isOverdue) {
        return {
          label: `Overdue — ${timing.text}`,
          badgeStyle: 'bg-status-critical/15 text-status-critical border-status-critical/30',
          nextAction: 'Next action: Upload the missing evidence immediately',
        };
      }
      if (timing.isAtRisk) {
        return {
          label: timing.text,
          badgeStyle: 'bg-status-warning/20 text-status-warning border-status-warning/40',
          nextAction: 'Next action: Upload the missing evidence before cutoff',
        };
      }
      return {
        label: `Pending submission — ${timing.text}`,
        badgeStyle: 'bg-gunmetal text-silver border-graphite-border',
        nextAction: 'Next action: Upload verified documentary proof',
      };
  }
}

export interface PlainAlertAnatomy {
  issue: string;
  whyItMatters: string;
  owner: string;
  howToResolve: string;
  urgencyText: string;
  actionUrl: string;
  actionLabel: string;
  reason?: string;
  dueDate?: string;
  nextStep: string;
}

/**
 * Formats every alert into plain, action-oriented English:
 * - What to do (e.g. "This application may miss its deadline. Review the pending verification.")
 * - The reason (when supported by data)
 * - Due date (when supported by data)
 * - Next step (explicit action instructions)
 * - Who owns the next step
 * - Why it matters
 * - How to resolve it
 */
export function formatPlainAlert(alert: any): PlainAlertAnatomy {
  const institutionName = alert?.application?.institution?.name || 'Institution';
  const appNumber = alert?.application?.applicationNumber || '';
  const stageName = alert?.application?.currentStage ? formatPlainStage(alert.application.currentStage) : 'review';

  // 1. Due date resolution (when supported by data)
  let dueDateText: string | undefined = undefined;
  if (alert?.obligation?.dueDate) {
    const timing = formatDaysRemaining(alert.obligation.dueDate);
    const dateFormatted = new Date(alert.obligation.dueDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    dueDateText = `${dateFormatted} (${timing.text})`;
  } else if (alert?.application?.deadlineDate) {
    const timing = formatDaysRemaining(alert.application.deadlineDate);
    const dateFormatted = new Date(alert.application.deadlineDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    dueDateText = `${dateFormatted} (${timing.text})`;
  }

  // 2. Issue, Reason, Next Step, and Resolution
  let issue = 'This application may miss its deadline. Review the pending verification.';
  let reason = `Statutory review timeframe is approaching cutoff for ${institutionName}.`;
  let nextStep = 'Review the pending verification and record observation notes to advance the application.';
  let howToResolve = 'Open the case dossier to inspect submitted evidence and record your stage determination.';
  let actionUrl = alert?.applicationId ? `/applications/${alert.applicationId}` : '/applications';
  let actionLabel = 'Review pending verification';

  const alertType = alert?.alertType || '';
  const rawMsg = (alert?.message || alert?.title || '').toLowerCase();

  if (alert?.obligation || alertType === 'MISSING_EVIDENCE') {
    const obligTitle = alert?.obligation?.title || 'compliance document';
    issue = `Mandatory compliance undertaking "${obligTitle}" is deficient. Upload the missing evidence.`;
    reason = `Required statutory evidence for "${obligTitle}" is missing or unverified for ${institutionName}.`;
    nextStep = 'Upload the missing signed evidence or renewed municipal certificate before the cutoff date.';
    howToResolve = 'Submit verified documentary proof in the compliance vault to clear the deficiency.';
    actionUrl = '/compliance';
    actionLabel = 'Upload missing evidence';
  } else if (alertType === 'OVERDUE_STAGE' || rawMsg.includes('overdue')) {
    issue = appNumber
      ? `Application ${appNumber} has exceeded its statutory deadline. Review the pending verification immediately.`
      : 'This application has exceeded its statutory deadline. Review the pending verification immediately.';
    reason = `Case ${appNumber ? `${appNumber} ` : ''}(${institutionName}) exceeded the statutory timeframe in stage "${stageName}".`;
    nextStep = 'Review the pending verification in the case dossier and record final stage determination.';
    howToResolve = 'Open the case dossier to record urgent review observations and advance the stage.';
    actionUrl = alert?.applicationId ? `/applications/${alert.applicationId}` : '/applications';
    actionLabel = 'Review pending verification';
  } else if (
    alertType === 'DEADLINE_WARNING' ||
    rawMsg.includes('deadline') ||
    rawMsg.includes('due in') ||
    rawMsg.includes('sla')
  ) {
    issue = 'This application may miss its deadline. Review the pending verification.';
    reason = `Application ${appNumber} (${institutionName}) has limited time remaining in stage "${stageName}" before SLA cutoff.`;
    nextStep = 'Review the pending verification and record observation notes to advance the application.';
    howToResolve = 'Open the case dossier to inspect submitted evidence and record stage determination.';
    actionUrl = alert?.applicationId ? `/applications/${alert.applicationId}` : '/applications';
    actionLabel = 'Review pending verification';
  } else if (alertType === 'DOCUMENT_EXPIRY' || alertType === 'EXPIRING_DOCUMENT' || rawMsg.includes('expir')) {
    issue = `Statutory certificate is nearing expiration for ${institutionName}. Submit the renewed document.`;
    reason = `Expired safety certificates or land leases void statutory institutional recognition under the Approval Process Handbook.`;
    nextStep = 'Submit renewed statutory certificate in the documents vault to avoid scrutiny hold.';
    howToResolve = 'Upload renewed municipal clearance certificate or registered deed in the documents vault.';
    actionUrl = '/documents';
    actionLabel = 'Upload renewed document';
  } else if (alertType === 'EVC_UNSCHEDULED' || alertType === 'EVC_DEADLINE' || rawMsg.includes('evc')) {
    issue = `Inspection panel has not been scheduled within statutory window for ${institutionName}. Appoint the expert committee.`;
    reason = `Statutory timeframe for physical campus inspection of ${institutionName} is nearing cutoff without confirmed panel.`;
    nextStep = 'Appoint a 3-member expert inspection panel and confirm the visit date.';
    howToResolve = 'Open the inspection coordinator to appoint panel experts and set the visit date.';
    actionUrl = '/evc';
    actionLabel = 'Schedule inspection';
  } else {
    issue = 'This application may miss its deadline. Review the pending verification.';
    reason = toSentenceCase(alert?.message || alert?.title || 'Statutory review window is expiring.');
    nextStep = 'Review the pending verification and complete the required action.';
    howToResolve = 'Inspect the case dossier and record verified resolution notes.';
    actionUrl = alert?.applicationId ? `/applications/${alert.applicationId}` : '/alerts';
    actionLabel = 'Review pending verification';
  }

  // 3. WHY IT MATTERS
  let whyItMatters =
    'Statutory requirement under the Approval Process Handbook. Delays application processing and risks administrative penalties.';
  if (alert?.severity === 'CRITICAL') {
    whyItMatters =
      'Critical regulatory blocker. Prevents approval determination and risks automatic rejection upon deadline cutoff.';
  } else if (alertType === 'OVERDUE_STAGE' || rawMsg.includes('overdue')) {
    whyItMatters =
      'Stage timeline breach. Delays regional inspection and causes cascade scheduling delays across the academic calendar.';
  } else if (alertType === 'DOCUMENT_EXPIRY' || alertType === 'EXPIRING_DOCUMENT') {
    whyItMatters =
      'Statutory compliance requirement. Expired municipal fire clearances or registered land leases void institutional approval.';
  }

  // 4. WHO OWNS THE NEXT STEP
  let owner = 'Assigned regulatory officer';
  if (alert?.recipientRole === 'INSTITUTION_USER') {
    owner = `Institution leadership (${institutionName})`;
  } else if (alert?.recipientRole === 'REGIONAL_OFFICER') {
    owner = 'Regional review officer';
  } else if (alert?.recipientRole === 'BUREAU_OFFICER') {
    owner = 'Bureau officer (Headquarters)';
  } else if (alert?.recipientRole === 'COMMITTEE_REVIEWER') {
    owner = 'Inspection committee review panel';
  } else if (alert?.recipientRole === 'SYSTEM_ADMIN') {
    owner = 'System administrator';
  }

  let urgencyText = 'Action needed';
  if (alert?.severity === 'CRITICAL') {
    urgencyText = 'Critical blocker — immediate action';
  } else if (alert?.severity === 'HIGH') {
    urgencyText = 'Urgent — action required';
  }

  return {
    issue,
    whyItMatters,
    owner,
    howToResolve,
    urgencyText,
    actionUrl,
    actionLabel,
    reason,
    dueDate: dueDateText,
    nextStep,
  };
}

/**
 * Sanitizes technical error messages to prevent exposing database keys,
 * Prisma stack traces, or raw internal errors to users.
 */
export function safeFormatError(err: any, fallbackMessage = "We couldn't save your changes. Try again."): string {
  if (!err) return fallbackMessage;
  const raw = typeof err === 'string' ? err : err.message || '';
  if (!raw) return fallbackMessage;

  // Filter out internal database, Prisma, or code stack traces
  const technicalSignatures = [
    'prisma',
    'findunique',
    'findfirst',
    'sqlite',
    'table',
    'syntaxerror',
    'typeerror',
    'cannot read properties',
    'database',
    'column',
    'constraint',
    'foreign key',
  ];

  const lower = raw.toLowerCase();
  const hasTechSignatures = technicalSignatures.some((sig) => lower.includes(sig));

  if (hasTechSignatures) {
    if (lower.includes('user') || lower.includes('credential') || lower.includes('auth')) {
      return 'Invalid email address or password. Try again.';
    }
    return fallbackMessage;
  }

  // Otherwise convert underscores to spaces and format nicely
  return toSentenceCase(raw);
}
