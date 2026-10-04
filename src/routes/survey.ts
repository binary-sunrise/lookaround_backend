import { Router } from 'express';
import { z } from 'zod';
import { store } from '../services/store';
import { BioCollectSurveySchema } from '../schemas';

const router = Router();

// GET /ws/survey/list/:projectId
router.get('/list/:projectId', (req, res, next) => {
  try {
    const { projectId } = req.params;
    const surveys = store.getSurveysByProjectId(projectId);
    const validated = z.array(BioCollectSurveySchema).parse(surveys);
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

export default router;
