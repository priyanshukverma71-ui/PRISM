import prisma from '../lib/prisma.js';
import { generateStableKey } from '../lib/hash.js';
import { recordAuditEvent } from '../audit/recorder.js';

export async function evaluateDeadlinesAndGenerateAlerts(): Promise<{
  alertsGenerated: number;
  escalationsTriggered: number;
}> {
  let alertsGenerated = 0;
  let escalationsTriggered = 0;
  const now = new Date();

  // 1. Evaluate Application Stage Deadlines
  const applications = await prisma.application.findMany({
    where: {
      status: { notIn: ['APPROVED', 'REJECTED', 'CLOSED'] },
      deadlineDate: { not: null },
    },
    include: { institution: true },
  });

  for (const app of applications) {
    if (!app.deadlineDate) continue;
    const deadline = new Date(app.deadlineDate);
    const msDiff = deadline.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      // Overdue
      const eventKey = generateStableKey('APP_DEADLINE_OVERDUE', app.id, Math.floor(Math.abs(daysRemaining) / 3));
      const existing = await prisma.alert.findUnique({ where: { eventKey } });
      if (!existing) {
        const alert = await prisma.alert.create({
          data: {
            eventKey,
            applicationId: app.id,
            recipientRole: 'REGIONAL_OFFICER',
            title: `Application ${app.applicationNumber} has exceeded its statutory deadline. Review the pending verification immediately.`,
            message: `Case ${app.applicationNumber} (${app.institution.name}) is ${Math.abs(daysRemaining)} days overdue in stage '${app.currentStage}'. Review the pending verification immediately.`,
            severity: 'CRITICAL',
            alertType: 'OVERDUE_STAGE',
            status: 'UNRESOLVED',
            escalationLevel: 2, // escalated directly
            deliveryAttempts: {
              create: [
                { channel: 'IN_APP', destination: 'REGIONAL_OFFICER_QUEUE', status: 'DELIVERED' },
                { channel: 'EMAIL', destination: 'regional.officer@aicte.gov.in', status: 'DELIVERED' },
              ],
            },
          },
        });
        alertsGenerated++;

        await recordAuditEvent({
          actionType: 'ALERT_GENERATED',
          targetType: 'ALERT',
          targetId: alert.id,
          reason: `Automated deadline evaluation detected ${Math.abs(daysRemaining)} days delay`,
        });
      }
    } else if (daysRemaining <= 2) {
      // High urgency warning
      const eventKey = generateStableKey('APP_DEADLINE_URGENT', app.id, 2);
      const existing = await prisma.alert.findUnique({ where: { eventKey } });
      if (!existing) {
        await prisma.alert.create({
          data: {
            eventKey,
            applicationId: app.id,
            recipientRole: 'REGIONAL_OFFICER',
            title: 'This application may miss its deadline. Review the pending verification.',
            message: `Application ${app.applicationNumber} (${app.institution.name}) may miss its statutory deadline in stage '${app.currentStage}'. Review the pending verification before cutoff.`,
            severity: 'HIGH',
            alertType: 'DEADLINE_WARNING',
            status: 'UNRESOLVED',
            escalationLevel: 1,
            deliveryAttempts: {
              create: [{ channel: 'IN_APP', destination: 'OFFICER_DASHBOARD', status: 'DELIVERED' }],
            },
          },
        });
        alertsGenerated++;
      }
    }
  }

  // 2. Evaluate EVC Scheduling Bottlenecks
  const evcVisits = await prisma.eVCVisit.findMany({
    where: { status: 'PENDING_SCHEDULE' },
    include: { application: { include: { institution: true } } },
  });

  for (const evc of evcVisits) {
    if (evc.schedulingDeadline) {
      const deadline = new Date(evc.schedulingDeadline);
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 3) {
        const eventKey = generateStableKey('EVC_UNSCHEDULED_WARNING', evc.id, daysRemaining <= 0 ? 'OVERDUE' : 'URGENT');
        const existing = await prisma.alert.findUnique({ where: { eventKey } });
        if (!existing) {
          await prisma.alert.create({
            data: {
              eventKey,
              applicationId: evc.applicationId,
              recipientRole: 'REGIONAL_OFFICER',
              title: `EVC PENDING: Expert Committee Unscheduled (${evc.application.applicationNumber})`,
              message: `EVC visit for ${evc.application.institution.name} remains unscheduled with ${daysRemaining <= 0 ? 'OVERDUE timeline' : `${daysRemaining} days left`}.`,
              severity: daysRemaining <= 0 ? 'CRITICAL' : 'HIGH',
              alertType: 'EVC_UNSCHEDULED',
              status: 'UNRESOLVED',
              escalationLevel: daysRemaining <= 0 ? 2 : 1,
              deliveryAttempts: {
                create: [{ channel: 'IN_APP', destination: 'EVC_COORDINATION_DESK', status: 'DELIVERED' }],
              },
            },
          });
          alertsGenerated++;
        }
      }
    }
  }

  // 3. Evaluate Compliance Obligations and Document Expiries
  const expiringDocs = await prisma.documentRecord.findMany({
    where: {
      expiryDate: { not: null },
    },
    include: { institution: true, application: true },
  });

  for (const doc of expiringDocs) {
    if (!doc.expiryDate) continue;
    const daysToExpiry = Math.ceil((new Date(doc.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysToExpiry <= 15) {
      const eventKey = generateStableKey('DOC_EXPIRY_RISK', doc.id, daysToExpiry <= 0 ? 'EXPIRED' : 'EXPIRING_SOON');
      const existing = await prisma.alert.findUnique({ where: { eventKey } });
      if (!existing) {
        await prisma.alert.create({
          data: {
            eventKey,
            applicationId: doc.applicationId || undefined,
            recipientRole: 'INSTITUTION_USER',
            title: daysToExpiry <= 0 ? `DOCUMENT EXPIRED: ${doc.title}` : `DOCUMENT EXPIRING: ${doc.title} (${daysToExpiry} days)`,
            message: `${doc.institution.name}: Regulatory record '${doc.title}' ${daysToExpiry <= 0 ? 'has expired' : `expires in ${daysToExpiry} days`}. Submit updated renewal to prevent scrutiny hold.`,
            severity: daysToExpiry <= 0 ? 'CRITICAL' : 'HIGH',
            alertType: 'DOCUMENT_EXPIRY',
            status: 'UNRESOLVED',
            escalationLevel: 1,
            deliveryAttempts: {
              create: [
                { channel: 'IN_APP', destination: 'INSTITUTION_PORTAL', status: 'DELIVERED' },
                { channel: 'EMAIL', destination: doc.institution.contactEmail, status: 'DELIVERED' },
              ],
            },
          },
        });
        alertsGenerated++;
      }
    }
  }

  // 4. Evaluate Unresolved Escalations
  const agedAlerts = await prisma.alert.findMany({
    where: {
      status: 'UNRESOLVED',
      severity: { in: ['HIGH', 'CRITICAL'] },
      escalationLevel: { lt: 3 },
    },
    include: { escalations: true },
  });

  for (const alert of agedAlerts) {
    const ageHours = (now.getTime() - alert.createdAt.getTime()) / (1000 * 60 * 60);
    // Escalate if unresolved after 24h
    if (ageHours >= 24 && alert.escalations.length === 0) {
      const nextLevel = alert.escalationLevel + 1;
      const targetRole = nextLevel === 2 ? 'BUREAU_OFFICER' : 'REGIONAL_OFFICER';

      await prisma.$transaction([
        prisma.alert.update({
          where: { id: alert.id },
          data: { escalationLevel: nextLevel },
        }),
        prisma.escalationEvent.create({
          data: {
            alertId: alert.id,
            fromLevel: alert.escalationLevel,
            toLevel: nextLevel,
            escalatedToRole: targetRole,
            reason: `Alert unresolved for ${Math.floor(ageHours)} hours; automated SLA escalation invoked.`,
          },
        }),
      ]);
      escalationsTriggered++;
    }
  }

  return { alertsGenerated, escalationsTriggered };
}
