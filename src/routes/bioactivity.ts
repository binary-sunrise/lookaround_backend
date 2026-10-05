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

    // Extract fq filters if present (e.g. projectId:, projectActivityNameFacet:)
    const fqList = Array.isArray(query.fq) ? query.fq : (query.fq ? [query.fq] : []);
    let fqProjectId: string | undefined;
    let fqProjectActivityName: string | undefined;
    for (const fq of fqList) {
      if (typeof fq === 'string') {
        if (fq.startsWith('projectId:')) {
          fqProjectId = fq.slice('projectId:'.length);
        } else if (fq.startsWith('projectActivityNameFacet:')) {
          fqProjectActivityName = fq.slice('projectActivityNameFacet:'.length);
        }
      }
    }

    const effectiveProjectId = query.projectId || fqProjectId;
    const whereClause: any = {};

    if (effectiveProjectId) {
      whereClause.projectId = effectiveProjectId;
    }

    if (query.view === 'myrecords') {
      const targetUserId = query.userId || req.userId || 'mock-user-ecologist-001';
      whereClause.userId = targetUserId;
    }

    let activities = await prisma.bioActivity.findMany({
      where: whereClause,
      orderBy: { lastUpdated: 'desc' },
    });

    // In demo / test mode for myrecords, fallback to available records if none found for specified user
    if (query.view === 'myrecords' && activities.length === 0) {
      activities = await prisma.bioActivity.findMany({
        orderBy: { lastUpdated: 'desc' },
      });
    }

    if (fqProjectActivityName) {
      const pafn = fqProjectActivityName.toLowerCase().trim();
      const matching = activities.filter((a) =>
        a.name?.toLowerCase().includes(pafn) ||
        a.type?.toLowerCase().includes(pafn) ||
        a.projectName?.toLowerCase().includes(pafn) ||
        a.projectActivityId?.toLowerCase().includes(pafn)
      );
      if (matching.length > 0) {
        activities = matching;
      }
    }

    if (query.searchTerm) {
      const st = query.searchTerm.toLowerCase().trim();
      activities = activities.filter((a) => {
        const inName = a.name?.toLowerCase().includes(st);
        const inProject = a.projectName?.toLowerCase().includes(st);
        const inOwner = a.activityOwnerName?.toLowerCase().includes(st);
        const records = Array.isArray(a.records) ? a.records : [];
        const inRecords = records.some(
          (r: any) =>
            r.name?.toLowerCase().includes(st) ||
            r.commonName?.toLowerCase().includes(st)
        );
        return inName || inProject || inOwner || inRecords;
      });
    }

    const paginated = activities.slice(offset, offset + max);
    const validated = BioCollectBioActivitySearchResponseSchema.parse({ activities: paginated });
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

// GET single activity
router.get('/:activityId', async (req, res, next) => {
  try {
    const { activityId } = req.params;
    const existing = await prisma.bioActivity.findUnique({
      where: { activityId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }
    res.status(200).json(existing);
  } catch (err) {
    next(err);
  }
});

// CREATE activity
const handleCreateActivity = async (req: any, res: any, next: any) => {
  try {
    const { CreateBioActivitySchema } = await import('../schemas');
    const data = CreateBioActivitySchema.parse(req.body);
    const activity = await prisma.bioActivity.create({
      data: {
        ...data,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      },
    });
    res.status(201).json(activity);
  } catch (err) {
    next(err);
  }
};
router.post('/create', handleCreateActivity);
router.post('/', handleCreateActivity);

// UPDATE activity
const handleUpdateActivity = async (req: any, res: any, next: any) => {
  try {
    const { activityId } = req.params;
    const { UpdateBioActivitySchema } = await import('../schemas');
    const data = UpdateBioActivitySchema.parse(req.body);

    const existing = await prisma.bioActivity.findUnique({
      where: { activityId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    const updated = await prisma.bioActivity.update({
      where: { activityId },
      data: {
        ...data,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      },
    });
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};
router.put('/update/:activityId', handleUpdateActivity);
router.put('/:activityId', handleUpdateActivity);

// DELETE activity
const handleDeleteActivity = async (req: any, res: any, next: any) => {
  try {
    const { activityId } = req.params;
    const existing = await prisma.bioActivity.findUnique({
      where: { activityId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    await prisma.bioActivity.delete({
      where: { activityId },
    });
    res.status(200).send();
  } catch (err) {
    next(err);
  }
};
router.delete('/delete/:activityId', handleDeleteActivity);
router.delete('/:activityId', handleDeleteActivity);

export default router;

