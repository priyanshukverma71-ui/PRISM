import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/summary', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const now = new Date();

    // Institution user filter: restrict to their own institution
    const institutionFilter = user.role === 'INSTITUTION_USER' && user.institutionId ? { institutionId: user.institutionId } : {};
    // Regional officer filter: restrict to their region if set
    const regionFilter = user.role === 'REGIONAL_OFFICER' && user.region ? { region: user.region } : {};

    const whereScope = {
      ...institutionFilter,
      ...regionFilter,
    };

    // 1. Total Applications & Stages
    const allApps = await prisma.application.findMany({
      where: whereScope,
      select: {
        id: true,
        currentStage: true,
        status: true,
        region: true,
        submissionDate: true,
        stageEntryDate: true,
        deadlineDate: true,
        riskScore: true,
        riskCategory: true,
      },
    });

    const totalApplications = allApps.length;

    const stageCounts: Record<string, number> = {};
    const regionalMap: Record<string, number> = {};
    const riskMap: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

    let totalDurationDays = 0;
    const ageing = {
      under7Days: 0,
      between7And14Days: 0,
      between15And30Days: 0,
      over30Days: 0,
    };

    allApps.forEach((app) => {
      // Stage breakdown
      stageCounts[app.currentStage] = (stageCounts[app.currentStage] || 0) + 1;
      // Regional breakdown
      regionalMap[app.region] = (regionalMap[app.region] || 0) + 1;
      // Risk breakdown
      riskMap[app.riskCategory] = (riskMap[app.riskCategory] || 0) + 1;

      // Ageing calculation
      const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(app.submissionDate).getTime()) / (1000 * 60 * 60 * 24)));
      totalDurationDays += ageDays;

      if (ageDays <= 7) ageing.under7Days++;
      else if (ageDays <= 14) ageing.between7And14Days++;
      else if (ageDays <= 30) ageing.between15And30Days++;
      else ageing.over30Days++;
    });

    const averageDurationDays = totalApplications > 0 ? Math.round(totalDurationDays / totalApplications) : 0;

    // 2. Critical Workflow Counters
    const pendingScrutiny = stageCounts['UNDER_SCRUTINY'] || 0;
    const clarificationRequired = stageCounts['CLARIFICATION_REQUIRED'] || 0;
    const evcPendingScheduling = stageCounts['EVC_PENDING'] || 0;

    // 3. EVC Approaching Deadline
    const evcApproachingDeadline = await prisma.eVCVisit.count({
      where: {
        status: 'PENDING_SCHEDULE',
        schedulingDeadline: {
          lte: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // 4. Compliance and Expiries
    const activeUndertakings = await prisma.complianceObligation.count({
      where: user.role === 'INSTITUTION_USER' && user.institutionId ? { institutionId: user.institutionId } : {},
    });

    const overdueObligations = await prisma.complianceObligation.count({
      where: {
        ...(user.role === 'INSTITUTION_USER' && user.institutionId ? { institutionId: user.institutionId } : {}),
        status: { in: ['EXPIRED', 'DEFICIENT'] },
      },
    });

    const documentsExpiringSoon = await prisma.documentRecord.count({
      where: {
        ...(user.role === 'INSTITUTION_USER' && user.institutionId ? { institutionId: user.institutionId } : {}),
        expiryDate: {
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // 5. Recent Alerts
    const recentAlerts = await prisma.alert.findMany({
      where: {
        status: 'UNRESOLVED',
        ...(user.role === 'INSTITUTION_USER' ? { recipientRole: 'INSTITUTION_USER' } : {}),
      },
      include: {
        application: {
          select: {
            id: true,
            applicationNumber: true,
            currentStage: true,
            deadlineDate: true,
            institution: { select: { name: true, code: true } },
          },
        },
        obligation: { select: { id: true, title: true, dueDate: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    // 6. Recent Audit Events
    const recentAuditEvents = await prisma.auditEvent.findMany({
      orderBy: { sequenceIndex: 'desc' },
      take: 8,
    });

    return res.json({
      success: true,
      data: {
        totalApplications,
        pendingScrutiny,
        clarificationRequired,
        evcPendingScheduling,
        evcApproachingDeadline,
        activeUndertakings,
        overdueObligations,
        documentsExpiringSoon,
        stageBreakdown: stageCounts,
        regionalDistribution: Object.entries(regionalMap).map(([region, count]) => ({ region, count })),
        riskDistribution: riskMap,
        applicationAgeing: ageing,
        averageProcessingDurationDays: averageDurationDays,
        recentAlerts,
        recentAuditEvents,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/risks', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const institutionFilter = user.role === 'INSTITUTION_USER' && user.institutionId ? { institutionId: user.institutionId } : {};

    const highRiskApps = await prisma.application.findMany({
      where: {
        ...institutionFilter,
        status: { notIn: ['APPROVED', 'REJECTED', 'CLOSED'] },
      },
      include: {
        institution: { select: { name: true, code: true, region: true } },
      },
      orderBy: { riskScore: 'desc' },
      take: 20,
    });

    const formatted = highRiskApps.map((app) => ({
      id: app.id,
      applicationNumber: app.applicationNumber,
      institutionName: app.institution.name,
      institutionCode: app.institution.code,
      region: app.region,
      currentStage: app.currentStage,
      status: app.status,
      deadlineDate: app.deadlineDate,
      riskScore: app.riskScore,
      riskCategory: app.riskCategory,
      riskFactors: JSON.parse(app.riskFactorsJson || '[]'),
    }));

    return res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

export default router;
