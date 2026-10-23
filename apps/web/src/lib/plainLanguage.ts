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
}

/**
 * Formats every alert into the 4-part plain language anatomy:
 * 1. The Issue
 * 2. Why it matters
 * 3. Who owns the next step
 * 4. How to resolve it
 */
export function formatPlainAlert(alert: any): PlainAlertAnatomy {
  const institutionName = alert?.application?.institution?.name || 'Institution';
  const appNumber = alert?.application?.applicationNumber || '';

  // 1. THE ISSUE
  let issue = alert?.message || alert?.title || 'Regulatory action required';
  if (alert?.obligation) {
    issue = `Mandatory compliance undertaking "${alert.obligation.title}" is deficient or missing evidence for ${institutionName}.`;
  } else if (alert?.alertType === 'OVERDUE_STAGE') {
    issue = `Application ${appNumber} (${institutionName}) has exceeded the statutory timeframe in stage "${formatPlainStage(alert.application?.currentStage)}".`;
  } else if (alert?.alertType === 'EVC_DEADLINE') {
    issue = `Inspection panel has not been scheduled within the statutory timeframe for ${institutionName}.`;
  }

  // 2. WHY IT MATTERS
  let whyItMatters =
    'Statutory requirement under the Approval Process Handbook. Delays application processing and risks compliance penalties.';
  if (alert?.severity === 'CRITICAL') {
    whyItMatters =
      'Critical regulatory requirement. Prevents approval determination and risks automatic rejection upon deadline cutoff.';
  } else if (alert?.alertType === 'OVERDUE_STAGE') {
    whyItMatters =
      'Stage timeline breach. Delays regional inspection and causes cascade delays across the academic calendar.';
  } else if (alert?.alertType === 'EXPIRING_DOCUMENT') {
    whyItMatters =
      'Statutory compliance requirement. Expired safety certificates or land leases void legal institutional recognition.';
  }

  // 3. WHO OWNS THE NEXT STEP
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

  // 4. HOW TO RESOLVE IT
  let howToResolve = 'Acknowledge the alert, inspect the relevant case dossier, and record verified resolution notes.';
  let actionUrl = '/alerts';
  let actionLabel = 'Review alert';

  if (alert?.obligation) {
    howToResolve = 'Upload the missing signed evidence or renewed municipal certificate in the compliance vault.';
    actionUrl = '/compliance';
    actionLabel = 'Upload document';
  } else if (alert?.applicationId) {
    howToResolve = 'Open the case dossier to record formal review observations or validate resubmissions.';
    actionUrl = `/applications/${alert.applicationId}`;
    actionLabel = 'View application';
  } else if (alert?.alertType === 'EVC_DEADLINE') {
    howToResolve = 'Appoint a 3-member expert inspection panel and confirm the visit date.';
    actionUrl = '/evc';
    actionLabel = 'Schedule inspection';
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
