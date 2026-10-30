import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../db/client';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  Project,
  CreateWardSchema,
} from '../schemas/bliffe';

const router = Router();

// GET /api/projects
router.get('/', async (req, res, next) => {
  try {
    const { status, search, q, organization, targetRegion, limit, offset } = req.query as any;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    const searchTerm = search || q;
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { organization: { contains: searchTerm, mode: 'insensitive' } },
        { targetRegion: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }
    if (organization) {
      where.organization = { contains: organization, mode: 'insensitive' };
    }
    if (targetRegion) {
      where.targetRegion = { contains: targetRegion, mode: 'insensitive' };
    }

    const take = limit ? Math.min(Number(limit), 100) : 50;
    const skip = offset ? Number(offset) : 0;

    const projects = await prisma.bLiffeProject.findMany({
      where,
      include: {
        _count: {
          select: {
            observations: true,
            wards: true,
            surveys: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    const result: Project[] = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      startDate: p.startDate || undefined,
      status: p.status as any,
      organization: p.organization || '',
      targetRegion: p.targetRegion || '',
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      syncStatus: p.syncStatus as any,
      observationCount: p._count.observations,
      wardCount: p._count.wards,
      surveyCount: p._count.surveys,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects
router.post('/', async (req, res, next) => {
  try {
    const input = CreateProjectSchema.parse(req.body);
    const id = input.id || crypto.randomUUID();

    const created = await prisma.bLiffeProject.create({
      data: {
        id,
        name: input.name.trim(),
        description: input.description?.trim() || '',
        startDate: input.startDate || new Date().toISOString(),
        status: input.status || 'active',
        organization: input.organization?.trim() || '',
        targetRegion: input.targetRegion?.trim() || '',
        syncStatus: input.syncStatus || 'synced',
      },
      include: {
        _count: {
          select: {
            observations: true,
            wards: true,
            surveys: true,
          },
        },
      },
    });

    const project: Project = {
      id: created.id,
      name: created.name,
      description: created.description || '',
      startDate: created.startDate || undefined,
      status: created.status as any,
      organization: created.organization || '',
      targetRegion: created.targetRegion || '',
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      syncStatus: created.syncStatus as any,
      observationCount: created._count.observations,
      wardCount: created._count.wards,
      surveyCount: created._count.surveys,
    };

    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await prisma.bLiffeProject.findUnique({
      where: { id },
      include: {
        wards: true,
        surveys: true,
        _count: {
          select: {
            observations: true,
            wards: true,
            surveys: true,
          },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const result: Project & { wards: any[]; surveys: any[] } = {
      id: project.id,
      name: project.name,
      description: project.description || '',
      startDate: project.startDate || undefined,
      status: project.status as any,
      organization: project.organization || '',
      targetRegion: project.targetRegion || '',
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      syncStatus: project.syncStatus as any,
      observationCount: project._count.observations,
      wardCount: project._count.wards,
      surveyCount: project._count.surveys,
      wards: project.wards.map((w) => ({
        id: w.id,
        projectId: w.projectId,
        wardNumber: w.wardNumber,
        wardName: w.wardName,
        localBodyName: w.localBodyName || '',
        district: w.district || '',
        state: w.state || '',
        keyLandmarks: w.keyLandmarks || '',
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
        syncStatus: w.syncStatus,
      })),
      surveys: project.surveys.map((s) => ({
        id: s.id,
        projectId: s.projectId,
        wardId: s.wardId,
        leadObserver: s.leadObserver,
        teamMembers: s.teamMembers,
        surveyMethod: s.surveyMethod,
        habitatType: s.habitatType,
        targetGroup: s.targetGroup,
        startTime: s.startTime,
        endTime: s.endTime,
        weatherNotes: s.weatherNotes,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        syncStatus: s.syncStatus,
      })),
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const input = UpdateProjectSchema.parse(req.body);

    const existing = await prisma.bLiffeProject.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const updated = await prisma.bLiffeProject.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.description !== undefined && { description: input.description?.trim() || '' }),
        ...(input.startDate !== undefined && { startDate: input.startDate }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.organization !== undefined && { organization: input.organization?.trim() || '' }),
        ...(input.targetRegion !== undefined && { targetRegion: input.targetRegion?.trim() || '' }),
        ...(input.syncStatus !== undefined && { syncStatus: input.syncStatus }),
      },
      include: {
        _count: {
          select: {
            observations: true,
            wards: true,
            surveys: true,
          },
        },
      },
    });

    const project: Project = {
      id: updated.id,
      name: updated.name,
      description: updated.description || '',
      startDate: updated.startDate || undefined,
      status: updated.status as any,
      organization: updated.organization || '',
      targetRegion: updated.targetRegion || '',
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      syncStatus: updated.syncStatus as any,
      observationCount: updated._count.observations,
      wardCount: updated._count.wards,
      surveyCount: updated._count.surveys,
    };

    res.json(project);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.bLiffeProject.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    await prisma.bLiffeProject.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:projectId/wards
router.get('/:projectId/wards', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const wards = await prisma.bLiffeWard.findMany({
      where: { projectId },
      orderBy: { wardNumber: 'asc' },
    });

    res.json(
      wards.map((w) => ({
        id: w.id,
        projectId: w.projectId,
        wardNumber: w.wardNumber,
        wardName: w.wardName,
        localBodyName: w.localBodyName || '',
        district: w.district || '',
        state: w.state || '',
        keyLandmarks: w.keyLandmarks || '',
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
        syncStatus: w.syncStatus,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:projectId/wards
router.post('/:projectId/wards', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const body = { ...req.body, projectId };
    const input = CreateWardSchema.parse(body);
    const id = input.id || crypto.randomUUID();

    const created = await prisma.bLiffeWard.create({
      data: {
        id,
        projectId,
        wardNumber: input.wardNumber.trim(),
        wardName: input.wardName.trim(),
        localBodyName: input.localBodyName?.trim() || '',
        district: input.district?.trim() || '',
        state: input.state?.trim() || '',
        keyLandmarks: input.keyLandmarks?.trim() || '',
        syncStatus: input.syncStatus || 'synced',
      },
    });

    res.status(201).json({
      id: created.id,
      projectId: created.projectId,
      wardNumber: created.wardNumber,
      wardName: created.wardName,
      localBodyName: created.localBodyName || '',
      district: created.district || '',
      state: created.state || '',
      keyLandmarks: created.keyLandmarks || '',
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      syncStatus: created.syncStatus,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

