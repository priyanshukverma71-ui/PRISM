/**
 * Plain Language Utilities for PRISM
 * Replaces cryptic technical labels with human-understandable operational statuses
 * and provides structured 4-part alert anatomy.
 */

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
 * Converts technical workflow stage enums into plain-language status
 */
export function formatPlainStage(stage?: string): string {
  if (!stage) return 'In Review';
  switch (stage) {
    case 'DRAFT':
      return 'In Preparation — Not Yet Submitted';
    case 'SUBMITTED':
      return 'Submitted — Waiting for Initial Scrutiny';
    case 'UNDER_SCRUTINY':
      return 'Under Scrutiny — Document Verification in Progress';
    case 'CLARIFICATION_REQUIRED':
      return 'Action Required — Deficiency Reported';
    case 'RESUBMITTED':
      return 'Resubmitted — Awaiting Re-Scrutiny';
    case 'EVC_PENDING':
      return 'Visit Pending — Expert Committee to be Appointed';
    case 'EVC_SCHEDULED':
      return 'Visit Scheduled — Inspection Impending';
    case 'EVC_COMPLETED':
      return 'Visit Completed — Committee Report Awaiting Review';
    case 'COMMITTEE_REVIEW':
      return 'Under Committee Review — SAC/SHC in Session';
    case 'AWAITING_AUTHORISED_DECISION':
      return 'Awaiting Final Statutory Sign-Off';
    case 'APPROVED':
      return 'Statutory Approval Granted';
    case 'REJECTED':
      return 'Application Rejected with Reasons';
    case 'CLOSED':
      return 'Case Closed';
    default:
      return String(stage).replace(/_/g, ' ');
  }
}

/**
 * Calculates human-understandable relative days remaining
 */
export function formatDaysRemaining(targetDate?: string | Date): {
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
  status: string,
  dueDate?: string | Date
): {
  label: string;
  badgeStyle: string;
  nextAction: string;
} {
  const timing = formatDaysRemaining(dueDate);

  switch (status) {
    case 'VERIFIED':
      return {
        label: 'Verified & Compliant',
        badgeStyle: 'bg-status-success/15 text-status-success border-status-success/30',
        nextAction: 'Next action: Compliant. No further action needed.',
      };

    case 'DEFICIENT':
      return {
        label: 'Action Required — Deficiency Reported',
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
        label: 'Waiting for Document Verification',
        badgeStyle: 'bg-blue-950/60 text-blue-300 border-blue-800',
        nextAction: 'Next action: Regional Officer to inspect evidence against APH checklist',
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
        label: `Pending Submission — ${timing.text}`,
        badgeStyle: 'bg-gunmetal text-silver border-graphite-border',
        nextAction: 'Next action: Upload verified documentary proof',
      };
  }
}

/**
 * Formats every alert into the 4-part anatomy:
 * 1. The Issue
 * 2. Why it matters
 * 3. Who owns the next step
 * 4. How to resolve it
 */
export function formatPlainAlert(alert: any): PlainAlertAnatomy {
  const institutionName = alert.application?.institution?.name || 'Institution';
  const appNumber = alert.application?.applicationNumber || '';

  // 1. THE ISSUE
  let issue = alert.message || alert.title;
  if (alert.obligation) {
    issue = `Mandatory compliance undertaking "${alert.obligation.title}" is deficient or missing evidence for ${institutionName}.`;
  } else if (alert.alertType === 'OVERDUE_STAGE') {
    issue = `Application ${appNumber} (${institutionName}) has exceeded the statutory timeframe in stage "${formatPlainStage(alert.application?.currentStage)}".`;
  } else if (alert.alertType === 'EVC_DEADLINE') {
    issue = `Expert Visiting Committee (EVC) has not been scheduled within the statutory timeframe for ${institutionName}.`;
  }

  // 2. WHY IT MATTERS
  let whyItMatters =
    'Statutory prerequisite under AICTE Approval Process Handbook (APH 2025). Halts application processing and may trigger audit penalties or approval withdrawal.';
  if (alert.severity === 'CRITICAL') {
    whyItMatters =
      'Critical regulatory violation under APH Chapter II. Prevents mandatory approval determination and risks automatic rejection upon cutoff date.';
  } else if (alert.alertType === 'OVERDUE_STAGE') {
    whyItMatters =
      'Stage SLA breach. Delays regional EVC dispatch and causes cascade delays across the national academic calendar.';
  } else if (alert.alertType === 'EXPIRING_DOCUMENT') {
    whyItMatters =
      'Statutory compliance requirement. Expired safety certificates or land leases void legal institutional recognition.';
  }

  // 3. WHO OWNS THE NEXT STEP
  let owner = 'Assigned Regulatory Officer';
  if (alert.recipientRole === 'INSTITUTION_USER') {
    owner = `Institution Principal & Head of Department (${institutionName})`;
  } else if (alert.recipientRole === 'REGIONAL_OFFICER') {
    owner = 'Regional Scrutiny Officer (Zonal Directorate)';
  } else if (alert.recipientRole === 'BUREAU_OFFICER') {
    owner = 'Bureau Officer (AICTE Headquarters)';
  } else if (alert.recipientRole === 'COMMITTEE_REVIEWER') {
    owner = 'Expert Visiting Committee Review Panel';
  } else if (alert.recipientRole === 'SYSTEM_ADMIN') {
    owner = 'PRISM System Administrator';
  }

  // 4. HOW TO RESOLVE IT
  let howToResolve = 'Acknowledge the alert, inspect the relevant case dossier, and record verified resolution notes.';
  let actionUrl = '/alerts';
  let actionLabel = 'Acknowledge & Resolve';

  if (alert.obligation) {
    howToResolve = 'Upload the missing signed evidence or renewed municipal NOC in the compliance vault.';
    actionUrl = '/compliance';
    actionLabel = 'Upload Evidence';
  } else if (alert.applicationId) {
    howToResolve = 'Open the case dossier to record formal scrutiny observations or validate resubmissions.';
    actionUrl = `/applications/${alert.applicationId}`;
    actionLabel = 'Open Case Dossier';
  } else if (alert.alertType === 'EVC_DEADLINE') {
    howToResolve = 'Appoint a 3-member expert inspection panel and confirm the on-site visit date.';
    actionUrl = '/evc';
    actionLabel = 'Schedule EVC Visit';
  }

  let urgencyText = 'Action Needed';
  if (alert.severity === 'CRITICAL') {
    urgencyText = 'Critical Blocker — Immediate Action';
  } else if (alert.severity === 'HIGH') {
    urgencyText = 'Urgent — Action Required';
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
