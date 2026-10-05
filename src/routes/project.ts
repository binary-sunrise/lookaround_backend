import { Router } from 'express';
import { prisma } from '../db/client';
import {
  ProjectSearchQuerySchema,
  ProjectSearchResponseSchema,
  BioCollectProjectSchema,
} from '../schemas';

const router = Router();

router.get('/search', async (req, res, next) => {
  try {
    const query = ProjectSearchQuerySchema.parse(req.query);
    const offset = query.offset ?? 0;
    const max = query.max ?? 30;

    const whereClause: any = {};
    if (query.hub) {
      whereClause.hub = { equals: query.hub, mode: 'insensitive' };
    }
    
    const searchText = query.q || query.queryText;
    if (searchText) {
      const term = searchText.replace(/\*/g, '').trim();
      if (term) {
        whereClause.OR = [
          { name: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { aim: { contains: term, mode: 'insensitive' } },
        ];
      }
    }

    const [total, projects] = await Promise.all([
      prisma.project.count({ where: whereClause }),
      prisma.project.findMany({
        where: whereClause,
        skip: offset,
        take: max,
      }),
    ]);

    const result = {
      facets: [{ name: 'hub', title: 'Hub', entries: [], total: 0 }],
      total,
      projects,
    };

    const validated = ProjectSearchResponseSchema.parse(result);
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

router.get('/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.project.findUnique({
      where: { projectId },
      include: { activities: true, surveys: true },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const formatted = { ...project, projectActivities: project.surveys || [] };
    const validated = BioCollectProjectSchema.parse(formatted);
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

export default router;
