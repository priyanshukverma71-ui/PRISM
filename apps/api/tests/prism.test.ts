import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import prisma from '../src/lib/prisma.js';
import { verifyAuditChainIntegrity } from '../src/audit/recorder.js';
import { evaluateDeadlinesAndGenerateAlerts } from '../src/alerts/evaluator.js';
import { runCounterfactualSimulation } from '../src/simulation/engine.js';
import { escapeFormulaInjection } from '../src/lib/hash.js';

describe('PRISM Regulatory Intelligence Platform Test Suite', () => {
  let adminToken: string;
  let officerToken: string;
  let institutionToken: string;
  let auditorToken: string;
  let testAppId: string;
  let testInstId: string;
  let otherInstId: string;

  beforeAll(async () => {
    // 1. Authenticate Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@prism.aicte.gov.in', password: 'Prism@2025' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.token;

    // 2. Authenticate Regional Officer
    const officerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'officer.mumbai@aicte.gov.in', password: 'Prism@2025' });
    expect(officerRes.status).toBe(200);
    officerToken = officerRes.body.token;

    // 3. Authenticate Institution User
    const instRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'principal@vjti.edu.in', password: 'Prism@2025' });
    expect(instRes.status).toBe(200);
    institutionToken = instRes.body.token;
    testInstId = instRes.body.user.institutionId;

    // 4. Authenticate Auditor
    const audRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auditor.cag@gov.in', password: 'Prism@2025' });
    expect(audRes.status).toBe(200);
    auditorToken = audRes.body.token;

    // Find other institution
    const otherInst = await prisma.institution.findFirst({
      where: { code: 'AICTE-NRO-2041' },
    });
    otherInstId = otherInst!.id;

    // Get an application belonging to VJTI in UNDER_SCRUTINY
    let appRecord = await prisma.application.findFirst({
      where: { institutionId: testInstId, currentStage: 'UNDER_SCRUTINY' },
    });
    if (!appRecord) {
      appRecord = await prisma.application.findFirst({
        where: { institutionId: testInstId },
      });
      if (appRecord) {
        await prisma.application.update({
          where: { id: appRecord.id },
          data: { currentStage: 'UNDER_SCRUTINY' },
        });
      }
    }
    testAppId = appRecord!.id;
  });

  describe('1. Authentication & Session Security', () => {
    it('rejects invalid password credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@prism.aicte.gov.in', password: 'WrongPassword!123' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects non-existent users', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@nobody.gov.in', password: 'Password@123' });
      expect(res.status).toBe(401);
    });

    it('denies protected endpoints without authentication token', async () => {
      const res = await request(app).get('/api/dashboard/summary');
      expect(res.status).toBe(401);
    });
  });

  describe('2. Tenant Isolation & Role-Based Access Control', () => {
    it('institutions cannot create applications for another institution', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${institutionToken}`)
        .send({
          institutionId: otherInstId, // Belongs to DIAEM, not VJTI!
          category: 'EXTENSION_OF_APPROVAL',
        });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });

    it('institutions cannot access another institution\'s private application detail', async () => {
      const otherApp = await prisma.application.findFirst({
        where: { institutionId: otherInstId },
      });
      const res = await request(app)
        .get(`/api/applications/${otherApp!.id}`)
        .set('Authorization', `Bearer ${institutionToken}`);
      expect(res.status).toBe(403);
    });

    it('read-only auditor cannot perform state transitions', async () => {
      const res = await request(app)
        .post(`/api/applications/${testAppId}/transition`)
        .set('Authorization', `Bearer ${auditorToken}`)
        .send({
          targetStage: 'APPROVED',
          action: 'GRANT_APPROVAL',
        });
      expect(res.status).toBe(500); // Caught by transition validator: role not allowed
    });
  });

  describe('3. Workflow State Transition Engine & Rules', () => {
    it('rejects illegal stage transitions (e.g. Draft directly to Approved)', async () => {
      const draftApp = await prisma.application.findFirst({
        where: { currentStage: 'DRAFT' },
      });
      const res = await request(app)
        .post(`/api/applications/${draftApp!.id}/transition`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetStage: 'APPROVED',
          action: 'GRANT_APPROVAL',
        });
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Illegal transition');
    });

    it('returned applications require a recorded reason', async () => {
      const res = await request(app)
        .post(`/api/applications/${testAppId}/return`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ reason: '' }); // empty reason
      expect(res.status).toBe(400);
    });

    it('valid return transitions application to CLARIFICATION_REQUIRED with observations', async () => {
      await prisma.application.update({
        where: { id: testAppId },
        data: { currentStage: 'UNDER_SCRUTINY' },
      });

      const res = await request(app)
        .post(`/api/applications/${testAppId}/return`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          reason: 'Land zoning certificate missing municipal endorsement stamp.',
          deficiencies: ['Missing municipal endorsement stamp on survey document'],
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify stage changed in DB
      const updated = await prisma.application.findUnique({ where: { id: testAppId } });
      expect(updated!.currentStage).toBe('CLARIFICATION_REQUIRED');
      expect(updated!.status).toBe('ACTION_REQUIRED');
    });
  });

  describe('4. EVC Scheduling & Prerequisite Validation', () => {
    it('rejects EVC scheduling when mandatory prerequisites are incomplete', async () => {
      const pendingEvc = await prisma.eVCVisit.findFirst({
        where: { prerequisitesSatisfied: false },
      });
      expect(pendingEvc).toBeDefined();

      const res = await request(app)
        .patch(`/api/evc/${pendingEvc!.id}`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          status: 'SCHEDULED',
          scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('EVC Scheduling Rejected');
    });
  });

  describe('5. Compliance Evidence Verification', () => {
    it('institutions can submit evidence and officer can verify it', async () => {
      // Find an obligation
      const obligation = await prisma.complianceObligation.findFirst({
        where: { institutionId: testInstId },
      });
      expect(obligation).toBeDefined();

      // Submit evidence
      const subRes = await request(app)
        .post(`/api/compliance/${obligation!.id}/submit`)
        .set('Authorization', `Bearer ${institutionToken}`)
        .send({
          fileName: 'Updated_Land_Encumbrance_2025.pdf',
          fileSize: 1048576,
          fileContentBase64: 'TEST_FILE_CONTENT_ENCODED_DATA',
        });

      expect(subRes.status).toBe(201);
      expect(subRes.body.data.fileHash).toBeDefined();

      // Verify evidence as officer
      const verRes = await request(app)
        .post(`/api/compliance/${obligation!.id}/verify`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          submissionId: subRes.body.data.id,
          status: 'VERIFIED',
          comments: 'Certified sub-registrar document verified in order.',
        });

      expect(verRes.status).toBe(200);
      expect(verRes.body.data.obligation.status).toBe('VERIFIED');
    });
  });

  describe('6. PRISM FutureLab Counterfactual Simulation', () => {
    it('simulation runs on isolated copy and never mutates real case in database', async () => {
      const beforeApp = await prisma.application.findUnique({ where: { id: testAppId } });

      const simResult = await runCounterfactualSimulation(testAppId, {
        scrutinyDelayDays: 5,
        evcDelayDays: 7,
        missingPrerequisites: ['FIRE_NOC'],
        leaseRenewalTiming: 'LATE_15_DAYS',
      });

      expect(simResult.disclaimer).toContain('SIMULATION — NOT AN OFFICIAL DECISION');
      expect(simResult.simulated.riskScore).toBeGreaterThan(beforeApp!.riskScore);
      expect(simResult.delta.delayDaysTotal).toBeGreaterThan(0);
      expect(simResult.recommendedInterventions.length).toBeGreaterThan(0);

      // Verify real application in database has NOT been mutated
      const afterApp = await prisma.application.findUnique({ where: { id: testAppId } });
      expect(afterApp!.currentStage).toBe(beforeApp!.currentStage);
      expect(afterApp!.riskScore).toBe(beforeApp!.riskScore);
    });
  });

  describe('7. Automated Alert Engine & Deduplication', () => {
    it('scheduler evaluates deadlines without creating duplicate alerts', async () => {
      const run1 = await evaluateDeadlinesAndGenerateAlerts();
      const run2 = await evaluateDeadlinesAndGenerateAlerts();

      // Second run immediately after should not generate duplicates because stable event keys exist
      expect(run2.alertsGenerated).toBe(0);
    });
  });

  describe('8. Tamper-Evident Flight Recorder & CSV Protection', () => {
    it('cryptographic hash chain verification succeeds across all audit records', async () => {
      const check = await verifyAuditChainIntegrity();
      expect(check.valid).toBe(true);
      expect(check.totalEvents).toBeGreaterThan(5);
    });

    it('properly neutralizes spreadsheet formula injection', () => {
      expect(escapeFormulaInjection('=cmd|/c calc')).toBe("'=cmd|/c calc");
      expect(escapeFormulaInjection('+12345')).toBe("'+12345");
      expect(escapeFormulaInjection('-500')).toBe("'-500");
      expect(escapeFormulaInjection('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
      expect(escapeFormulaInjection('Normal Text')).toBe('Normal Text');
    });
  });
});
