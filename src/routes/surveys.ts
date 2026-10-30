import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../db/client';
import {
  CreateSurveySchema,
  UpdateSurveySchema,
  Survey,
} from '../schemas/bliffe';

const router = Router();

// GET /api/surveys
router.get('/', async (req, res, next) => {
  try {
    const { projectId, wardId, leadObserver, search } = req.query as any;

    const where: any = {};
    if (projectId) {
      where.projectId = projectId;
    }
    if (wardId) {
      where.wardId = wardId;
    }
    if (leadObserver) {
      where.leadObserver = { contains: leadObserver, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { leadObserver: { contains: search, mode: 'insensitive' } },
        { surveyMethod: { contains: search, mode: 'insensitive' } },
        { habitatType: { contains: search, mode: 'insensitive' } },
        { targetGroup: { contains: search, mode: 'insensitive' } },
        { weatherNotes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const surveys = await prisma.bLiffeSurvey.findMany({
      where,
      include: {
        _count: {
          select: { observations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result: Survey[] = surveys.map((s) => ({
      id: s.id,
      projectId: s.projectId,
      wardId: s.wardId,
      leadObserver: s.leadObserver,
      teamMembers: s.teamMembers,
      surveyMethod: s.surveyMethod || '',
      habitatType: s.habitatType || '',
      targetGroup: s.targetGroup || '',
      startTime: s.startTime,
      endTime: s.endTime || undefined,
      weatherNotes: s.weatherNotes || '',
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      syncStatus: s.syncStatus as any,
      observationCount: s._count.observations,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/surveys
router.post('/', async (req, res, next) => {
  try {
    const input = CreateSurveySchema.parse(req.body);
    const id = input.id || crypto.randomUUID();

    const created = await prisma.bLiffeSurvey.create({
      data: {
        id,
        projectId: input.projectId,
        wardId: input.wardId,
        leadObserver: input.leadObserver.trim(),
        teamMembers: input.teamMembers || [],
        surveyMethod: input.surveyMethod || 'Opportunistic Encounter',
        habitatType: input.habitatType || 'Urban Park / Garden',
        targetGroup: input.targetGroup || 'All Biodiversity',
        startTime: input.startTime,
        endTime: input.endTime || null,
        weatherNotes: input.weatherNotes?.trim() || '',
        syncStatus: input.syncStatus || 'synced',
      },
      include: {
        _count: {
          select: { observations: true },
        },
      },
    });

    const survey: Survey = {
      id: created.id,
      projectId: created.projectId,
      wardId: created.wardId,
      leadObserver: created.leadObserver,
      teamMembers: created.teamMembers,
      surveyMethod: created.surveyMethod || '',
      habitatType: created.habitatType || '',
      targetGroup: created.targetGroup || '',
      startTime: created.startTime,
      endTime: created.endTime || undefined,
      weatherNotes: created.weatherNotes || '',
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      syncStatus: created.syncStatus as any,
      observationCount: created._count.observations,
    };

    res.status(201).json(survey);
  } catch (err) {
    next(err);
  }
});

// GET /api/surveys/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const survey = await prisma.bLiffeSurvey.findUnique({
      where: { id },
      include: {
        _count: {
          select: { observations: true },
        },
      },
    });

    if (!survey) {
      res.status(404).json({ error: 'Survey not found' });
      return;
    }

    const result: Survey = {
      id: survey.id,
      projectId: survey.projectId,
      wardId: survey.wardId,
      leadObserver: survey.leadObserver,
      teamMembers: survey.teamMembers,
      surveyMethod: survey.surveyMethod || '',
      habitatType: survey.habitatType || '',
      targetGroup: survey.targetGroup || '',
      startTime: survey.startTime,
      endTime: survey.endTime || undefined,
      weatherNotes: survey.weatherNotes || '',
      createdAt: survey.createdAt.toISOString(),
      updatedAt: survey.updatedAt.toISOString(),
      syncStatus: survey.syncStatus as any,
      observationCount: survey._count.observations,
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/surveys/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const input = UpdateSurveySchema.parse(req.body);

    const existing = await prisma.bLiffeSurvey.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Survey not found' });
      return;
    }

    const updated = await prisma.bLiffeSurvey.update({
      where: { id },
      data: {
        ...(input.leadObserver !== undefined && { leadObserver: input.leadObserver.trim() }),
        ...(input.teamMembers !== undefined && { teamMembers: input.teamMembers }),
        ...(input.surveyMethod !== undefined && { surveyMethod: input.surveyMethod }),
        ...(input.habitatType !== undefined && { habitatType: input.habitatType }),
        ...(input.targetGroup !== undefined && { targetGroup: input.targetGroup }),
        ...(input.startTime !== undefined && { startTime: input.startTime }),
        ...(input.endTime !== undefined && { endTime: input.endTime }),
        ...(input.weatherNotes !== undefined && { weatherNotes: input.weatherNotes }),
        ...(input.syncStatus !== undefined && { syncStatus: input.syncStatus }),
      },
      include: {
        _count: {
          select: { observations: true },
        },
      },
    });

    const survey: Survey = {
      id: updated.id,
      projectId: updated.projectId,
      wardId: updated.wardId,
      leadObserver: updated.leadObserver,
      teamMembers: updated.teamMembers,
      surveyMethod: updated.surveyMethod || '',
      habitatType: updated.habitatType || '',
      targetGroup: updated.targetGroup || '',
      startTime: updated.startTime,
      endTime: updated.endTime || undefined,
      weatherNotes: updated.weatherNotes || '',
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      syncStatus: updated.syncStatus as any,
      observationCount: updated._count.observations,
    };

    res.json(survey);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/surveys/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.bLiffeSurvey.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Survey not found' });
      return;
    }

    await prisma.bLiffeSurvey.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: 'Survey deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;

