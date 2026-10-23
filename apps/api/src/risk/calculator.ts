export interface RiskEvaluationResult {
  score: number;
  category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[];
  calculatedAt: string;
}

export interface ApplicationRiskInput {
  currentStage: string;
  stageEntryDate: Date | string;
  deadlineDate?: Date | string | null;
  obligations?: Array<{
    status: string;
    dueDate: Date | string;
    title: string;
    category: string;
  }>;
  documents?: Array<{
    verificationStatus: string;
    expiryDate?: Date | string | null;
    title: string;
  }>;
  evcVisits?: Array<{
    status: string;
    schedulingDeadline?: Date | string | null;
    prerequisitesSatisfied: boolean;
  }>;
  returnReason?: string | null;
}

export function evaluateApplicationRisk(input: ApplicationRiskInput): RiskEvaluationResult {
  let score = 0;
  const factors: string[] = [];
  const now = new Date();

  // 1. Deadline proximity and overdue analysis
  if (input.deadlineDate) {
    const deadline = new Date(input.deadlineDate);
    const msDiff = deadline.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      score += 40;
      factors.push(`CRITICAL: Regulatory stage deadline passed ${Math.abs(daysRemaining)} days ago`);
    } else if (daysRemaining <= 2) {
      score += 28;
      factors.push(`HIGH PROXIMITY: Regulatory deadline imminent (${daysRemaining} days remaining)`);
    } else if (daysRemaining <= 5) {
      score += 15;
      factors.push(`MODERATE PROXIMITY: Stage deadline approaching in ${daysRemaining} days`);
    }
  }

  // 2. Stage Ageing Analysis
  const stageEntry = new Date(input.stageEntryDate);
  const stageAgeDays = Math.max(0, Math.floor((now.getTime() - stageEntry.getTime()) / (1000 * 60 * 60 * 24)));
  if (stageAgeDays >= 14) {
    score += 20;
    factors.push(`AGEING WARNING: Application retained in stage '${input.currentStage}' for ${stageAgeDays} days (Threshold: 14 days)`);
  } else if (stageAgeDays >= 7) {
    score += 10;
    factors.push(`STAGE LATENCY: Application in '${input.currentStage}' for ${stageAgeDays} days`);
  }

  // 3. Document Expiry Proximity
  if (input.documents && input.documents.length > 0) {
    for (const doc of input.documents) {
      if (doc.expiryDate) {
        const exp = new Date(doc.expiryDate);
        const daysToExpiry = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysToExpiry < 0) {
          score += 35;
          factors.push(`EXPIRED DOCUMENT: Prescribed record '${doc.title}' expired ${Math.abs(daysToExpiry)} days ago`);
        } else if (daysToExpiry <= 15) {
          score += 22;
          factors.push(`DOCUMENT EXPIRY RISK: '${doc.title}' expires in ${daysToExpiry} days`);
        }
      }
      if (doc.verificationStatus === 'REJECTED') {
        score += 18;
        factors.push(`VERIFICATION DEFICIENCY: Uploaded document '${doc.title}' was rejected during scrutiny`);
      }
    }
  }

  // 4. Compliance Obligations Status
  if (input.obligations && input.obligations.length > 0) {
    for (const ob of input.obligations) {
      if (ob.status === 'DEFICIENT') {
        score += 25;
        factors.push(`COMPLIANCE DEFICIENCY: Unresolved deficiency reported for '${ob.title}'`);
      } else if (ob.status === 'EXPIRED') {
        score += 30;
        factors.push(`OVERDUE UNDERTAKING: '${ob.title}' deadline has passed without valid submission`);
      } else if (ob.status === 'PENDING') {
        const obDue = new Date(ob.dueDate);
        const daysRemaining = Math.ceil((obDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 3 && daysRemaining >= 0) {
          score += 16;
          factors.push(`SUBMISSION DUE: Required evidence for '${ob.title}' due in ${daysRemaining} days`);
        }
      }
    }
  }

  // 5. EVC Scheduling Bottlenecks
  if (input.currentStage === 'EVC_PENDING') {
    const unscheduledEvc = input.evcVisits?.find((v) => v.status === 'PENDING_SCHEDULE');
    if (unscheduledEvc) {
      if (!unscheduledEvc.prerequisitesSatisfied) {
        score += 22;
        factors.push('EVC PREREQUISITE BLOCKED: Mandatory scrutiny prerequisites not yet certified for visit scheduling');
      } else {
        score += 15;
        factors.push('EVC UNASSIGNED: Application eligible for EVC visit but inspection committee not scheduled');
      }
    }
  }

  // 6. Return / Clarification Reason
  if (input.currentStage === 'CLARIFICATION_REQUIRED' || input.returnReason) {
    score += 15;
    factors.push(`ACTION REQUIRED: Application returned to institution. Reason: "${input.returnReason || 'Deficiency clarification needed'}"`);
  }

  // Cap score between 0 and 100
  const finalScore = Math.min(100, Math.max(0, Math.round(score)));

  let category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (finalScore >= 80) category = 'CRITICAL';
  else if (finalScore >= 55) category = 'HIGH';
  else if (finalScore >= 25) category = 'MEDIUM';

  return {
    score: finalScore,
    category,
    factors: factors.length > 0 ? factors : ['No active delay risks or regulatory deficiencies detected'],
    calculatedAt: new Date().toISOString(),
  };
}
