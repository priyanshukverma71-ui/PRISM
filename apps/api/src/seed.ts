import bcrypt from 'bcryptjs';
import prisma from './lib/prisma.js';
import { DEFAULT_WORKFLOW_STAGES, DEFAULT_TRANSITIONS } from './workflow/engine.js';
import { evaluateApplicationRisk } from './risk/calculator.js';
import { recordAuditEvent } from './audit/recorder.js';
import { sha256 } from './lib/hash.js';

async function main() {
  console.log('[PRISM SEED] Commencing synthetic demonstration database seeding...');

  // Clean existing records in correct relation order
  await prisma.escalationEvent.deleteMany();
  await prisma.alertDeliveryAttempt.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.simulationScenario.deleteMany();
  await prisma.ruleDraft.deleteMany();
  await prisma.complianceSubmission.deleteMany();
  await prisma.complianceObligation.deleteMany();
  await prisma.documentRecord.deleteMany();
  await prisma.eVCVisit.deleteMany();
  await prisma.caseAssignment.deleteMany();
  await prisma.stageHistory.deleteMany();
  await prisma.application.deleteMany();
  await prisma.workflowVersion.deleteMany();
  await prisma.workflowTemplate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.institution.deleteMany();

  const defaultPasswordHash = await bcrypt.hash('Prism@2025', 10);

  // 1. Seed Institutions across Regions
  const inst1 = await prisma.institution.create({
    data: {
      code: 'AICTE-WRO-1092',
      name: 'Veermata Jijabai Technological Institute (VJTI)',
      type: 'Engineering & Technology',
      region: 'Western',
      address: 'H R Mahajani Rd, Matunga, Mumbai, Maharashtra 400019',
      contactEmail: 'principal@vjti.edu.in',
      contactPhone: '+91-22-24198101',
      accreditation: 'NAAC A++, NBA Tier-I',
    },
  });

  const inst2 = await prisma.institution.create({
    data: {
      code: 'AICTE-NRO-2041',
      name: 'Delhi Institute of Advanced Engineering & Management',
      type: 'Management & Technology',
      region: 'Northern',
      address: 'Institutional Area, Sector 62, Noida, Uttar Pradesh 201301',
      contactEmail: 'director@diaem.edu.in',
      contactPhone: '+91-120-2598000',
      accreditation: 'NAAC A',
    },
  });

  const inst3 = await prisma.institution.create({
    data: {
      code: 'AICTE-SRO-3055',
      name: 'Coimbatore Apex Institute of Technology',
      type: 'Engineering',
      region: 'Southern',
      address: 'Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu 641004',
      contactEmail: 'dean@cait.edu.in',
      contactPhone: '+91-422-2572177',
      accreditation: 'NAAC A+',
    },
  });

  const inst4 = await prisma.institution.create({
    data: {
      code: 'AICTE-ERO-4019',
      name: 'Kolkata Heritage Institute of Pharmaceutical Sciences',
      type: 'Pharmacy',
      region: 'Eastern',
      address: 'Chowbaga Road, Anandapur, Kolkata, West Bengal 700107',
      contactEmail: 'principal@khips.edu.in',
      contactPhone: '+91-33-24430456',
      accreditation: 'NBA Accredited',
    },
  });

  const inst5 = await prisma.institution.create({
    data: {
      code: 'AICTE-SWRO-5082',
      name: 'Bengaluru Tech Valley Institute of Architecture',
      type: 'Architecture & Planning',
      region: 'South-Western',
      address: 'Whitefield Main Road, Bengaluru, Karnataka 560066',
      contactEmail: 'admin@btvia.edu.in',
      contactPhone: '+91-80-41128900',
      accreditation: 'Council of Architecture Approved',
    },
  });

  // 2. Seed Users across all 6 Roles
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@prism.aicte.gov.in',
      passwordHash: defaultPasswordHash,
      name: 'Dr. Rajesh Verma',
      role: 'SYSTEM_ADMIN',
      region: 'Central',
      status: 'ACTIVE',
    },
  });

  const regOfficer = await prisma.user.create({
    data: {
      email: 'officer.mumbai@aicte.gov.in',
      passwordHash: defaultPasswordHash,
      name: 'Sunil Deshmukh',
      role: 'REGIONAL_OFFICER',
      region: 'Western',
      status: 'ACTIVE',
    },
  });

  const bureauOfficer = await prisma.user.create({
    data: {
      email: 'bureau.head@aicte.gov.in',
      passwordHash: defaultPasswordHash,
      name: 'Dr. Anita Roy',
      role: 'BUREAU_OFFICER',
      region: 'Central',
      status: 'ACTIVE',
    },
  });

  const committeeReviewer = await prisma.user.create({
    data: {
      email: 'reviewer.sharma@aicte.gov.in',
      passwordHash: defaultPasswordHash,
      name: 'Prof. K. K. Sharma',
      role: 'COMMITTEE_REVIEWER',
      region: 'Northern',
      status: 'ACTIVE',
    },
  });

  const instUser1 = await prisma.user.create({
    data: {
      email: 'principal@vjti.edu.in',
      passwordHash: defaultPasswordHash,
      name: 'Dr. Sachin Patil (VJTI)',
      role: 'INSTITUTION_USER',
      institutionId: inst1.id,
      region: 'Western',
      status: 'ACTIVE',
    },
  });

  const instUser2 = await prisma.user.create({
    data: {
      email: 'director@diaem.edu.in',
      passwordHash: defaultPasswordHash,
      name: 'Dr. Manisha Gupta (DIAEM)',
      role: 'INSTITUTION_USER',
      institutionId: inst2.id,
      region: 'Northern',
      status: 'ACTIVE',
    },
  });

  const auditorUser = await prisma.user.create({
    data: {
      email: 'auditor.cag@gov.in',
      passwordHash: defaultPasswordHash,
      name: 'Vikramaditya Bose',
      role: 'AUDITOR',
      region: 'Central',
      status: 'ACTIVE',
    },
  });

  // 3. Seed Workflow Templates
  const stagesJson = JSON.stringify(DEFAULT_WORKFLOW_STAGES);
  const transitionsJson = JSON.stringify(DEFAULT_TRANSITIONS);

  const fullCycleTemplate = await prisma.workflowTemplate.create({
    data: {
      code: 'FULL_CYCLE',
      name: 'Standard Approval Process Cycle (Scrutiny + EVC + SAC)',
      description: 'Comprehensive regulatory approval lifecycle including institutional document scrutiny, physical Expert Visit Committee inspection, and Standing Appellate Committee review.',
      activeVersion: 1,
      versions: {
        create: {
          versionNumber: 1,
          isPublished: true,
          publishedAt: new Date(),
          publishedBy: adminUser.id,
          changeSummary: 'Baseline statutory configuration per APH 2025-26 rules',
          stagesJson,
          transitionsJson,
        },
      },
    },
    include: { versions: true },
  });

  const scrutinyOnlyTemplate = await prisma.workflowTemplate.create({
    data: {
      code: 'ONLY_SCRUTINY',
      name: 'Accelerated Approval (Scrutiny Only)',
      description: 'Streamlined approval for accredited autonomous institutions eligible for exemption from physical inspection under APH Chapter II.',
      activeVersion: 1,
      versions: {
        create: {
          versionNumber: 1,
          isPublished: true,
          publishedAt: new Date(),
          publishedBy: adminUser.id,
          changeSummary: 'Exemption route configuration per APH 2025-26',
          stagesJson,
          transitionsJson,
        },
      },
    },
    include: { versions: true },
  });

  const now = new Date();

  // Helper date generators
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  // 4. Seed Synthetic Applications (13 diverse cases)
  const applicationsData = [
    {
      appNum: 'APP-2025-WRO-0491',
      inst: inst1,
      cat: 'EXTENSION_OF_APPROVAL',
      stage: 'UNDER_SCRUTINY',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      submittedDays: 12,
      stageEntryDays: 8,
      deadlineDays: 2, // Urgent deadline
      observations: 'Land lease deed renewal certificate under review by Regional Scrutiny Panel.',
    },
    {
      appNum: 'APP-2025-WRO-0512',
      inst: inst1,
      cat: 'INTAKE_INCREASE',
      stage: 'CLARIFICATION_REQUIRED',
      status: 'ACTION_REQUIRED',
      priority: 'HIGH',
      submittedDays: 18,
      stageEntryDays: 4,
      deadlineDays: 3,
      returnReason: 'Cadre ratio deficiency: Required Professor-to-Student ratio in AI & Data Science course not satisfied.',
      observations: 'Deficiency communicated to institution on portal.',
    },
    {
      appNum: 'APP-2025-NRO-1104',
      inst: inst2,
      cat: 'NEW_INSTITUTION',
      stage: 'EVC_PENDING',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      submittedDays: 25,
      stageEntryDays: 7,
      deadlineDays: -2, // OVERDUE EVC
      observations: 'Scrutiny cleared. EVC committee constitution pending due to regional panel shortage.',
    },
    {
      appNum: 'APP-2025-NRO-1188',
      inst: inst2,
      cat: 'NEW_COURSE',
      stage: 'EVC_SCHEDULED',
      status: 'IN_PROGRESS',
      priority: 'NORMAL',
      submittedDays: 14,
      stageEntryDays: 3,
      deadlineDays: 6,
      observations: 'EVC scheduled for upcoming Tuesday; panel chairman confirmed.',
    },
    {
      appNum: 'APP-2025-SRO-2201',
      inst: inst3,
      cat: 'EXTENSION_OF_APPROVAL',
      stage: 'EVC_COMPLETED',
      status: 'IN_PROGRESS',
      priority: 'NORMAL',
      submittedDays: 22,
      stageEntryDays: 2,
      deadlineDays: 5,
      observations: 'Physical inspection completed. Geotagged lab evidence verified with zero deficiencies.',
    },
    {
      appNum: 'APP-2025-SRO-2290',
      inst: inst3,
      cat: 'INTAKE_INCREASE',
      stage: 'COMMITTEE_REVIEW',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      submittedDays: 30,
      stageEntryDays: 4,
      deadlineDays: 4,
      observations: 'Standing Hearing Committee review in progress; faculty biometric logs verified.',
    },
    {
      appNum: 'APP-2025-ERO-3341',
      inst: inst4,
      cat: 'EXTENSION_OF_APPROVAL',
      stage: 'AWAITING_DECISION',
      status: 'PENDING_ACTION',
      priority: 'NORMAL',
      submittedDays: 35,
      stageEntryDays: 2,
      deadlineDays: 3,
      observations: 'All scrutiny and inspection requirements cleared; forwarded for competent authority approval.',
    },
    {
      appNum: 'APP-2025-ERO-3398',
      inst: inst4,
      cat: 'NEW_COURSE',
      stage: 'APPROVED',
      status: 'APPROVED',
      priority: 'LOW',
      submittedDays: 45,
      stageEntryDays: 15,
      deadlineDays: 0,
      observations: 'Statutory approval issued for M.Pharm in Industrial Pharmacy.',
    },
    {
      appNum: 'APP-2025-SWRO-4410',
      inst: inst5,
      cat: 'NEW_INSTITUTION',
      stage: 'UNDER_SCRUTINY',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      submittedDays: 16,
      stageEntryDays: 16, // Ageing latency
      deadlineDays: -4, // OVERDUE
      observations: 'Scrutiny stage prolonged awaiting clarification on municipal land zoning certificate.',
    },
    {
      appNum: 'APP-2025-SWRO-4482',
      inst: inst5,
      cat: 'EXTENSION_OF_APPROVAL',
      stage: 'DRAFT',
      status: 'PENDING_ACTION',
      priority: 'LOW',
      submittedDays: 2,
      stageEntryDays: 2,
      deadlineDays: 25,
      observations: 'Institution populating architectural facility details.',
    },
    {
      appNum: 'APP-2025-WRO-0677',
      inst: inst1,
      cat: 'EXTENSION_OF_APPROVAL',
      stage: 'SUBMITTED',
      status: 'IN_PROGRESS',
      priority: 'NORMAL',
      submittedDays: 1,
      stageEntryDays: 1,
      deadlineDays: 10,
      observations: 'Initial application submitted; in regional scrutiny assignment queue.',
    },
    {
      appNum: 'APP-2025-NRO-1349',
      inst: inst2,
      cat: 'EXTENSION_OF_APPROVAL',
      stage: 'REJECTED',
      status: 'REJECTED',
      priority: 'NORMAL',
      submittedDays: 50,
      stageEntryDays: 20,
      deadlineDays: 0,
      returnReason: 'Non-curable land title defect and failure to submit required statutory corpus fund.',
      observations: 'Letter of Rejection issued following appeal rejection by SHC.',
    },
    {
      appNum: 'APP-2025-SRO-2415',
      inst: inst3,
      cat: 'NEW_COURSE',
      stage: 'RESUBMITTED',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      submittedDays: 20,
      stageEntryDays: 1,
      deadlineDays: 5,
      observations: 'Institution uploaded revised faculty recruitment orders responding to deficiency notice.',
    },
  ];

  const seededApplications = [];

  for (const item of applicationsData) {
    const submissionDate = daysAgo(item.submittedDays);
    const stageEntryDate = daysAgo(item.stageEntryDays);
    const deadlineDate = item.deadlineDays !== 0 ? daysFromNow(item.deadlineDays) : null;

    const riskEval = evaluateApplicationRisk({
      currentStage: item.stage,
      stageEntryDate,
      deadlineDate,
      returnReason: item.returnReason,
    });

    const app = await prisma.application.create({
      data: {
        applicationNumber: item.appNum,
        institutionId: item.inst.id,
        region: item.inst.region,
        category: item.cat,
        academicYear: '2025-2026',
        workflowTemplateId: fullCycleTemplate.id,
        workflowVersionId: fullCycleTemplate.versions[0].id,
        currentStage: item.stage,
        status: item.status,
        priority: item.priority,
        riskScore: riskEval.score,
        riskCategory: riskEval.category,
        riskFactorsJson: JSON.stringify(riskEval.factors),
        assignedOfficerId: regOfficer.id,
        submissionDate,
        stageEntryDate,
        deadlineDate,
        observations: item.observations,
        returnReason: item.returnReason,
        metadataJson: JSON.stringify({
          appliedIntake: 180,
          shift: 'First Shift',
          courses: ['Computer Engineering', 'Artificial Intelligence', 'Data Science'],
        }),
      },
    });

    // Create stage histories
    await prisma.stageHistory.create({
      data: {
        applicationId: app.id,
        fromStage: 'DRAFT',
        toStage: 'SUBMITTED',
        actorId: instUser1.id,
        actorRole: 'INSTITUTION_USER',
        action: 'SUBMIT_APPLICATION',
        comments: 'Application fee paid and statutory declarations verified',
        createdAt: submissionDate,
      },
    });

    if (item.stage !== 'SUBMITTED' && item.stage !== 'DRAFT') {
      await prisma.stageHistory.create({
        data: {
          applicationId: app.id,
          fromStage: 'SUBMITTED',
          toStage: item.stage,
          actorId: regOfficer.id,
          actorRole: 'REGIONAL_OFFICER',
          action: 'ADVANCE_STAGE',
          comments: item.observations,
          createdAt: stageEntryDate,
        },
      });
    }

    seededApplications.push(app);
  }

  // 5. Seed Compliance Obligations & Prescribed Documents
  const app1 = seededApplications[0]; // VJTI APP-2025-WRO-0491
  const app3 = seededApplications[2]; // DIAEM APP-2025-NRO-1104
  const app5 = seededApplications[4]; // CAIT APP-2025-SRO-2201

  // Obligation 1: Lease Deed (Expiring in 8 days - Critical Demo Scenario!)
  const ob1 = await prisma.complianceObligation.create({
    data: {
      institutionId: inst1.id,
      applicationId: app1.id,
      title: '30-Year Registered Land Lease Deed & Sub-Registrar Encumbrance Certificate',
      category: 'LAND_BUILDING',
      description: 'Proof of continuous registered lease of institutional land with minimum remaining period of 25 years per APH Clause 4.1.',
      prescribedDocType: 'LEASE_DEED',
      dueDate: daysFromNow(8),
      warningDate: daysFromNow(2),
      status: 'PENDING',
      severity: 'CRITICAL',
    },
  });

  // Obligation 2: Fire Safety NOC
  const ob2 = await prisma.complianceObligation.create({
    data: {
      institutionId: inst1.id,
      applicationId: app1.id,
      title: 'Valid Fire Safety NOC from State Disaster Management Authority',
      category: 'SAFETY_NOC',
      description: 'Annual inspection clearance certificate for institutional multi-storey academic blocks.',
      prescribedDocType: 'FIRE_NOC',
      dueDate: daysFromNow(18),
      warningDate: daysFromNow(10),
      status: 'VERIFIED',
      severity: 'HIGH',
    },
  });

  // Obligation 3: Faculty Biometric Register (Overdue!)
  const ob3 = await prisma.complianceObligation.create({
    data: {
      institutionId: inst2.id,
      applicationId: app3.id,
      title: 'Faculty Biometric Attendance & Salary Disbursal Mandate',
      category: 'FACULTY_CADRE',
      description: 'Audited bank statements confirming 7th CPC scale payments through direct digital transfer.',
      prescribedDocType: 'SALARY_DISBURSAL_STATEMENT',
      dueDate: daysAgo(5), // OVERDUE
      warningDate: daysAgo(10),
      status: 'DEFICIENT',
      severity: 'CRITICAL',
    },
  });

  // 6. Seed Submissions for Obligations
  const subFileHash = sha256('FIRE_SAFETY_NOC_CERT_VJTI_2025_APPROVED');
  await prisma.complianceSubmission.create({
    data: {
      obligationId: ob2.id,
      institutionId: inst1.id,
      submittedById: instUser1.id,
      docCategory: 'SAFETY_NOC',
      fileName: 'Maharashtra_Fire_Service_NOC_2025.pdf',
      fileSize: 2450890,
      fileHash: subFileHash,
      version: 1,
      status: 'VERIFIED',
      reviewerId: regOfficer.id,
      reviewComments: 'Valid certificate verified against state government registry portal.',
      reviewedAt: daysAgo(2),
      createdAt: daysAgo(5),
    },
  });

  // 7. Seed Prescribed Document Records (with Expiry Tracking)
  // Document expiring in 8 days
  await prisma.documentRecord.create({
    data: {
      institutionId: inst1.id,
      applicationId: app1.id,
      title: 'Institutional Campus Land Lease Agreement (Plot 4B)',
      category: 'LEASE_AGREEMENT',
      issueDate: daysAgo(365 * 10),
      expiryDate: daysFromNow(8), // EXPIRES IN 8 DAYS!
      storageKey: 'vault/wro/vjti_lease_2025.pdf',
      fileHash: sha256('LEASE_DOC_PLOT_4B_EXPIRING_SOON'),
      fileName: 'VJTI_Registered_Lease_Deed_Plot4B.pdf',
      fileSize: 4508900,
      verificationStatus: 'PENDING',
      metadataJson: JSON.stringify({ surveyNumber: '409/2A', areaAcres: 12.5 }),
    },
  });

  // Expired document
  await prisma.documentRecord.create({
    data: {
      institutionId: inst2.id,
      applicationId: app3.id,
      title: 'Building Stability & Structural Soundness Certificate',
      category: 'BUILDING_STABILITY',
      issueDate: daysAgo(365 * 3),
      expiryDate: daysAgo(14), // EXPIRED 14 DAYS AGO
      storageKey: 'vault/nro/diaem_stability.pdf',
      fileHash: sha256('BUILDING_STABILITY_EXPIRED_2025'),
      fileName: 'Structural_Audit_Certificate_2022.pdf',
      fileSize: 1890200,
      verificationStatus: 'EXPIRED',
    },
  });

  // Valid long-term document
  await prisma.documentRecord.create({
    data: {
      institutionId: inst3.id,
      applicationId: app5.id,
      title: 'State Government No-Objection Certificate (NOC)',
      category: 'NOC_STATE_GOVT',
      issueDate: daysAgo(180),
      expiryDate: daysFromNow(365 * 5),
      storageKey: 'vault/sro/cait_state_noc.pdf',
      fileHash: sha256('STATE_GOVT_NOC_VALID_5_YEARS'),
      fileName: 'TamilNadu_HigherEdu_NOC_2025.pdf',
      fileSize: 1240800,
      verificationStatus: 'VERIFIED',
    },
  });

  // 8. Seed EVC Inspection Visits
  await prisma.eVCVisit.create({
    data: {
      applicationId: app3.id, // DIAEM NRO (Pending schedule)
      visitType: 'REGULAR',
      status: 'PENDING_SCHEDULE',
      schedulingDeadline: daysFromNow(2),
      prerequisitesSatisfied: false, // Prerequisite blocked!
    },
  });

  await prisma.eVCVisit.create({
    data: {
      applicationId: seededApplications[3].id, // APP-2025-NRO-1188 (Scheduled)
      visitType: 'REGULAR',
      status: 'SCHEDULED',
      scheduledDate: daysFromNow(4),
      schedulingDeadline: daysFromNow(10),
      committeeLeadId: committeeReviewer.id,
      committeeMembersJson: JSON.stringify([
        'Prof. K. K. Sharma (Committee Chairman)',
        'Dr. V. N. Rao (AICTE Expert Member)',
        'Er. Rajesh Mehra (Architectural Expert)',
      ]),
      prerequisitesSatisfied: true,
    },
  });

  await prisma.eVCVisit.create({
    data: {
      applicationId: app5.id, // CAIT SRO (Completed)
      visitType: 'REGULAR',
      status: 'COMPLETED',
      scheduledDate: daysAgo(6),
      completedDate: daysAgo(2),
      committeeLeadId: committeeReviewer.id,
      committeeMembersJson: JSON.stringify(['Prof. K. K. Sharma', 'Dr. Ramesh Kumar']),
      findings: 'Campus infrastructure verified. High-performance computing labs, mechanical workshops, and library holding exceed minimum prescribed norms. Zero adverse observations recorded.',
      reportHash: sha256('CAIT_EVC_INSPECTION_SATISFACTORY_2025'),
      reportReference: 'EVC-REP-SRO-2025-089',
      prerequisitesSatisfied: true,
    },
  });

  // 9. Seed System Alerts & Escalation Events
  const alert1 = await prisma.alert.create({
    data: {
      eventKey: 'APP_DEADLINE_OVERDUE:APP-2025-NRO-1104:1',
      applicationId: app3.id,
      recipientRole: 'REGIONAL_OFFICER',
      title: 'OVERDUE: Application APP-2025-NRO-1104 Exceeded Stage Deadline',
      message: 'Delhi Institute of Advanced Engineering & Management is 2 days overdue in stage EVC_PENDING. Urgent committee appointment required.',
      severity: 'CRITICAL',
      alertType: 'OVERDUE_STAGE',
      status: 'UNRESOLVED',
      escalationLevel: 2,
      deliveryAttempts: {
        create: [
          { channel: 'IN_APP', destination: 'REGIONAL_OFFICER_QUEUE', status: 'DELIVERED' },
          { channel: 'EMAIL', destination: 'officer.mumbai@aicte.gov.in', status: 'DELIVERED' },
        ],
      },
      escalations: {
        create: {
          fromLevel: 1,
          toLevel: 2,
          escalatedToRole: 'BUREAU_OFFICER',
          reason: 'Application exceeded stage SLA by 48 hours without scheduled inspection visit.',
          createdAt: daysAgo(1),
        },
      },
    },
  });

  const alert2 = await prisma.alert.create({
    data: {
      eventKey: 'DOC_EXPIRY_RISK:LEASE_PLOT4B:EXPIRING_SOON',
      applicationId: app1.id,
      recipientRole: 'INSTITUTION_USER',
      title: 'DOCUMENT EXPIRING: Campus Land Lease Agreement (8 days remaining)',
      message: 'Veermata Jijabai Technological Institute: Prescribed land lease record expires in 8 days. Submit registered renewal deed immediately to avoid scrutiny halt.',
      severity: 'HIGH',
      alertType: 'DOCUMENT_EXPIRY',
      status: 'UNRESOLVED',
      escalationLevel: 1,
      deliveryAttempts: {
        create: [
          { channel: 'IN_APP', destination: 'INSTITUTION_PORTAL', status: 'DELIVERED' },
          { channel: 'EMAIL', destination: 'principal@vjti.edu.in', status: 'DELIVERED' },
        ],
      },
    },
  });

  // 10. Seed Chronological Tamper-Evident Flight Recorder (Audit Log)
  await recordAuditEvent({
    actor: adminUser,
    actionType: 'SYSTEM_BOOTSTRAP',
    targetType: 'SYSTEM',
    targetId: 'PRISM-CORE',
    reason: 'Initialised PRISM regulatory intelligence engine and loaded APH 2025-26 baseline rule templates.',
  });

  await recordAuditEvent({
    actor: instUser1,
    actionType: 'APPLICATION_CREATE',
    targetType: 'APPLICATION',
    targetId: app1.id,
    newState: { applicationNumber: app1.applicationNumber, stage: 'DRAFT' },
    reason: 'Institution initiated annual Extension of Approval application.',
  });

  await recordAuditEvent({
    actor: instUser1,
    actionType: 'STAGE_TRANSITION',
    targetType: 'APPLICATION',
    targetId: app1.id,
    previousState: { stage: 'DRAFT' },
    newState: { stage: 'SUBMITTED' },
    reason: 'Application submitted with certified affidavits and statutory fee receipt.',
  });

  await recordAuditEvent({
    actor: regOfficer,
    actionType: 'STAGE_TRANSITION',
    targetType: 'APPLICATION',
    targetId: app1.id,
    previousState: { stage: 'SUBMITTED' },
    newState: { stage: 'UNDER_SCRUTINY' },
    reason: 'Regional Scrutiny Committee commenced institutional document verification.',
  });

  await recordAuditEvent({
    actor: regOfficer,
    actionType: 'STAGE_TRANSITION',
    targetType: 'APPLICATION',
    targetId: seededApplications[1].id,
    previousState: { stage: 'UNDER_SCRUTINY' },
    newState: { stage: 'CLARIFICATION_REQUIRED' },
    reason: 'Cadre ratio deficit detected in proposed AI & Data Science division.',
  });

  await recordAuditEvent({
    actor: regOfficer,
    actionType: 'COMPLIANCE_VERIFIED',
    targetType: 'COMPLIANCE',
    targetId: ob2.id,
    newState: { status: 'VERIFIED' },
    reason: 'Maharashtra Fire Service clearance NOC validated against municipal fire authority database.',
    documentHash: subFileHash,
  });

  // 11. Seed Rule Compiler Drafts
  await prisma.ruleDraft.create({
    data: {
      ruleId: 'APH-2025-CH2-SEC4.1',
      sourceDoc: 'AICTE Approval Process Handbook 2025-26',
      sourceVersion: '2025.1',
      pageRef: 'Page 38',
      sectionRef: 'Chapter II, Section 4.1',
      title: 'Mandatory Land Lease Duration & Sub-Registrar Covenant',
      extractedText: 'The land on which the Institution is situated shall be in the lawful possession of the Applicant Trust/Society/Company through registered Sale Deed or registered Lease Deed for a minimum period of 30 years with clear encumbrance certificate issued by the competent Sub-Registrar Authority.',
      conditionJson: JSON.stringify({
        prerequisite: 'REGISTERED_LEASE_DEED',
        minimumPeriodYears: 30,
        encumbranceRequired: true,
      }),
      actionJson: JSON.stringify({
        onFailure: 'BLOCK_STAGE_TRANSITION',
        targetStage: 'EVC_PENDING',
      }),
      timelineDays: 14,
      prerequisitesJson: JSON.stringify(['SUB_REGISTRAR_NOC', 'NON_ENCUMBRANCE_CERT']),
      confidenceScore: 0.98,
      status: 'APPROVED',
      reviewerId: adminUser.id,
      reviewComments: 'Officially approved and incorporated into baseline scrutiny checklist.',
    },
  });

  await prisma.ruleDraft.create({
    data: {
      ruleId: 'APH-2025-CH3-SEC2.3',
      sourceDoc: 'AICTE Approval Process Handbook 2025-26',
      sourceVersion: '2025.1',
      pageRef: 'Page 62',
      sectionRef: 'Chapter III, Section 2.3',
      title: 'Surprise EVC Inspection Prerequisite for Infrastructure Deficiencies',
      extractedText: 'In cases where anonymous or verified complaints regarding non-existent laboratories or shared infrastructure are received with prima facie evidence, AICTE shall schedule an unannounced surprise EVC inspection within 7 working days without prior intimation to the institution.',
      conditionJson: JSON.stringify({
        trigger: 'VERIFIED_COMPLAINT_RECEIVED',
        inspectionType: 'SURPRISE_EVC',
      }),
      actionJson: JSON.stringify({
        scheduleDays: 7,
        intimationToInstitution: false,
      }),
      timelineDays: 7,
      prerequisitesJson: JSON.stringify(['VIGILANCE_BUREAU_CLEARANCE']),
      confidenceScore: 0.91,
      status: 'DRAFT',
      notes: 'Under review by Bureau Officer for procedural alignment.',
    },
  });

  console.log('[PRISM SEED] Synthetic database seeding completed successfully!');
  console.log(`- Institutions: 5`);
  console.log(`- Users: 7 (All 6 roles initialized)`);
  console.log(`- Applications: 13`);
  console.log(`- Compliance Obligations: 3`);
  console.log(`- Document Records: 3`);
  console.log(`- EVC Visits: 3`);
  console.log(`- System Alerts: 2`);
  console.log(`- Audit Events: 6 (Cryptographically linked)`);
  console.log(`- Rule Drafts: 2`);
}

main()
  .catch((e) => {
    console.error('[PRISM SEED ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
