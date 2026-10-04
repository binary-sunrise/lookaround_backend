import { Router } from 'express';
import { store } from '../services/store';
import {
  ActivitySearchQuerySchema,
  BioCollectBioActivitySearchResponseSchema,
} from '../schemas';

const router = Router();

// GET /ws/bioactivity/search
router.get('/search', (req, res, next) => {
  try {
    const query = ActivitySearchQuerySchema.parse(req.query);
    const result = store.searchActivities(query, req.userId);
    const validated = BioCollectBioActivitySearchResponseSchema.parse(result);
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

// DELETE /ws/bioactivity/delete/:activityId
router.delete('/delete/:activityId', (req, res, next) => {
  try {
    const { activityId } = req.params;
    const deleted = store.deleteActivity(activityId);

    if (deleted) {
      // Contract: 200 OK with Void schema (no JSON payload required)
      res.status(200).send();
    } else {
      res.status(404).json({ error: 'Activity not found' });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
