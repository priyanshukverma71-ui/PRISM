import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { runCounterfactualSimulation, SimulationParameters } from './engine.js';
import { recordAuditEvent } from '../audit/recorder.js';

const router = Router();

const SimulationRequestSchema = z.object({
  applicationId: z.string().uuid(),
  name: z.string().optional(),
  scrutinyDelayDays: z.number().min(0).max(30).optional(),
  evcDelayDays: z.number().min(0).max(30).optional(),
  missingPrerequisites: z.array(z.string()).optional(),
  leaseRenewalTiming: z.enum(['ON_TIME', 'LATE_5_DAYS', 'LATE_15_DAYS', 'EXPIRED']).optional(),
  delayedEvidenceDays: z.number().min(0).max(30).optional(),
  workloadPressureMultiplier: z.number().min(1.0).max(3.0).optional(),
  interventionScenario: z.enum(['NONE', 'FAST_TRACK_EVC', 'SPECIAL_SCRUTINY_DRIVE', 'PROVISIONAL_UNDERTAKING']).optional(),
});

router.post('/', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const body = SimulationRequestSchema.parse(req.body);

    const simulationResult = await runCounterfactualSimulation(body.applicationId, body);

    const scenario = await prisma.simulationScenario.create({
      data: {
        name: body.name || `Scenario-${Date.now().toString().slice(-4)}: ${simulationResult.applicationNumber}`,
        createdById: user.id,
        baseApplicationId: body.applicationId,
        parametersJson: JSON.stringify(body),
        resultsJson: JSON.stringify(simulationResult),
      },
    });

    await recordAuditEvent({
      actor: user,
      actionType: 'SIMULATION_RUN',
      targetType: 'SIMULATION',
      targetId: scenario.id,
      reason: `FutureLab simulation executed for ${simulationResult.applicationNumber}`,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: scenario.id,
        ...simulationResult,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const scenario = await prisma.simulationScenario.findUnique({ where: { id } });

    if (!scenario) {
      return res.status(404).json({ success: false, error: 'Simulation scenario not found' });
    }

    return res.json({
      success: true,
      data: {
        id: scenario.id,
        name: scenario.name,
        createdAt: scenario.createdAt,
        parameters: JSON.parse(scenario.parametersJson),
        results: JSON.parse(scenario.resultsJson),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
