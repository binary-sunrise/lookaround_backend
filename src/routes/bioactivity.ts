import { Router } from 'express';
import { prisma } from '../db/client';
import {
  ActivitySearchQuerySchema,
  BioCollectBioActivitySearchResponseSchema,
} from '../schemas';

const router = Router();

router.get('/search', async (req, res, next) => {
  try {
    const query = ActivitySearchQuerySchema.parse(req.query);
    const offset = query.offset ?? 0;
    const max = query.max ?? 20;

    const whereClause: any = {};
    if (query.projectId) {
      whereClause.projectId = query.projectId;
    }
    
    if (query.view === 'myrecords') {
        const targetUserId = query.userId || req.userId || 'mock-user-ecologist-001';
        whereClause.userId = targetUserId;
    }

    const activities = await prisma.bioActivity.findMany({
      where: whereClause,
      skip: offset,
      take: max,
    });

    const validated = BioCollectBioActivitySearchResponseSchema.parse({ activities });
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

router.delete('/delete/:activityId', async (req, res, next) => {
  try {
    const { activityId } = req.params;
    await prisma.bioActivity.delete({
      where: { activityId },
    });
    res.status(200).send();
  } catch (err) {
    res.status(404).json({ error: 'Activity not found' });
  }
});

export default router;
