import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { escapeFormulaInjection } from '../lib/hash.js';

const router = Router();

router.get('/analytics', authenticate, async (req: Request, res: Response, next) => {
  try {
    const [
      applications,
      evcVisits,
      obligations,
      documents,
      alerts,
      escalations,
    ] = await Promise.all([
      prisma.application.findMany({
        include: { institution: { select: { name: true, region: true, type: true } } },
      }),
      prisma.eVCVisit.findMany(),
      prisma.complianceObligation.findMany(),
      prisma.documentRecord.findMany(),
      prisma.alert.findMany({ include: { deliveryAttempts: true } }),
      prisma.escalationEvent.findMany(),
    ]);

    // 1. Stage Pendency
    const stagePendency: Record<string, number> = {};
    applications.forEach((a) => {
      stagePendency[a.currentStage] = (stagePendency[a.currentStage] || 0) + 1;
    });

    // 2. Region Workload
    const regionWorkload: Record<string, number> = {};
    applications.forEach((a) => {
      regionWorkload[a.region] = (regionWorkload[a.region] || 0) + 1;
    });

    // 3. EVC Status
    const evcStatusCounts: Record<string, number> = {};
    evcVisits.forEach((v) => {
      evcStatusCounts[v.status] = (evcStatusCounts[v.status] || 0) + 1;
    });

    // 4. Compliance Breakdown
    const complianceBreakdown: Record<string, number> = {};
    obligations.forEach((o) => {
      complianceBreakdown[o.status] = (complianceBreakdown[o.status] || 0) + 1;
    });

    // 5. Document Expiry Proximity
    const now = new Date();
    const docExpiries = {
      expired: 0,
      expiringIn30Days: 0,
      expiringIn90Days: 0,
      valid: 0,
    };
    documents.forEach((d) => {
      if (!d.expiryDate) {
        docExpiries.valid++;
        return;
      }
      const days = Math.ceil((new Date(d.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (days < 0) docExpiries.expired++;
      else if (days <= 30) docExpiries.expiringIn30Days++;
      else if (days <= 90) docExpiries.expiringIn90Days++;
      else docExpiries.valid++;
    });

    // 6. Escalations by Level
    const escalationLevels: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    escalations.forEach((e) => {
      escalationLevels[e.toLevel] = (escalationLevels[e.toLevel] || 0) + 1;
    });

    // 7. Alert Delivery Success
    let totalAttempts = 0;
    let deliveredAttempts = 0;
    alerts.forEach((a) => {
      a.deliveryAttempts.forEach((attempt) => {
        totalAttempts++;
        if (attempt.status === 'DELIVERED') deliveredAttempts++;
      });
    });

    return res.json({
      success: true,
      data: {
        stagePendency: Object.entries(stagePendency).map(([stage, count]) => ({ stage, count })),
        regionWorkload: Object.entries(regionWorkload).map(([region, count]) => ({ region, count })),
        evcStatus: Object.entries(evcStatusCounts).map(([status, count]) => ({ status, count })),
        complianceStatus: Object.entries(complianceBreakdown).map(([status, count]) => ({ status, count })),
        documentExpirySummary: docExpiries,
        escalationDistribution: escalationLevels,
        alertDeliveryRate: totalAttempts > 0 ? Math.round((deliveredAttempts / totalAttempts) * 100) : 100,
        totalApplications: applications.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/export', authenticate, async (req: Request, res: Response, next) => {
  try {
    const applications = await prisma.application.findMany({
      include: { institution: true, workflowTemplate: true },
      orderBy: { submissionDate: 'desc' },
    });

    const headers = [
      'Application Number',
      'Institution Name',
      'Institution Code',
      'Region',
      'Category',
      'Stage',
      'Status',
      'Priority',
      'Risk Score',
      'Risk Category',
      'Submission Date',
      'Deadline Date',
    ];

    const rows = applications.map((a) => [
      escapeFormulaInjection(a.applicationNumber),
      escapeFormulaInjection(a.institution.name),
      escapeFormulaInjection(a.institution.code),
      escapeFormulaInjection(a.region),
      escapeFormulaInjection(a.category),
      escapeFormulaInjection(a.currentStage),
      escapeFormulaInjection(a.status),
      escapeFormulaInjection(a.priority),
      a.riskScore,
      escapeFormulaInjection(a.riskCategory),
      a.submissionDate.toISOString().split('T')[0],
      a.deadlineDate ? a.deadlineDate.toISOString().split('T')[0] : 'N/A',
    ]);

    const csvData = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=prism-applications-report-${Date.now()}.csv`);
    return res.send(csvData);
  } catch (error) {
    next(error);
  }
});

export default router;
