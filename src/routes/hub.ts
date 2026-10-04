import { Router } from 'express';
import { z } from 'zod';
import { store } from '../services/store';
import { BioCollectHubSchema } from '../schemas';

const router = Router();

// GET /ws/hub/pwaList
router.get('/pwaList', (_req, res, next) => {
  try {
    const hubs = store.getHubs();
    const validated = z.array(BioCollectHubSchema).parse(hubs);
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

export default router;
