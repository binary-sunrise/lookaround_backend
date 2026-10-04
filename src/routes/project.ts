import { Router } from 'express';
import { store } from '../services/store';
import {
  ProjectSearchQuerySchema,
  ProjectSearchResponseSchema,
  BioCollectProjectSchema,
} from '../schemas';

const router = Router();

// GET /ws/project/search
router.get('/search', (req, res, next) => {
  try {
    const query = ProjectSearchQuerySchema.parse(req.query);
    const result = store.searchProjects(query);
    const validated = ProjectSearchResponseSchema.parse(result);
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

// GET /ws/project/:projectId
router.get('/:projectId', (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = store.getProjectById(projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const validated = BioCollectProjectSchema.parse(project);
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

export default router;
