import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { BioCollectSurveySchema } from '../schemas';

const router = Router();

// GET /ws/survey/list/:projectId
router.get('/list/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const surveys = await prisma.survey.findMany({
      where: { projectId },
    });
    const validated = z.array(BioCollectSurveySchema).parse(surveys);
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

export default router;
