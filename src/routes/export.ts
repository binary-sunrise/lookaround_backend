import { Router } from 'express';
import { prisma } from '../db/client';
import { exportObservationsAsDwC } from '../services/dwcExportService';
import { mapPrismaToObservation } from './observations';

const router = Router();

// GET /api/export/dwc
router.get('/dwc', async (req, res, next) => {
  try {
    const { projectId, wardId, surveyId } = req.query as any;

    const where: any = {};
    if (projectId) {
      where.OR = [{ projectId }, { projectIds: { has: projectId } }];
    }
    if (wardId) {
      where.wardId = wardId;
    }
    if (surveyId) {
      where.surveyId = surveyId;
    }

    const observations = await prisma.bLiffeObservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const mapped = observations.map(mapPrismaToObservation);
    const dwcExport = exportObservationsAsDwC(mapped);
    res.json(dwcExport);
  } catch (err) {
    next(err);
  }
});

export default router;
