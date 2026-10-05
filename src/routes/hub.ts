import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { BioCollectHubSchema } from '../schemas';

const router = Router();

// GET /ws/hub/pwaList
router.get('/pwaList', async (_req, res, next) => {
  try {
    const hubs = await prisma.hub.findMany();
    const validated = z.array(BioCollectHubSchema).parse(hubs);
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

export default router;
