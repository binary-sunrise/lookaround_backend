import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../db/client';
import {
  CreateWardSchema,
  UpdateWardSchema,
  WardIdentifyRequestSchema,
  Ward,
} from '../schemas/bliffe';
import { identifyWardFromCoordinates } from '../services/wardService';

const router = Router();

// POST /api/wards/identify (and GET /api/wards/identify)
const handleIdentifyWard = async (req: any, res: any, next: any) => {
  try {
    const raw = req.method === 'POST' ? req.body : req.query;
    const { latitude, longitude } = WardIdentifyRequestSchema.parse(raw);
    const result = identifyWardFromCoordinates(latitude, longitude);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

router.post('/identify', handleIdentifyWard);
router.get('/identify', handleIdentifyWard);

// GET /api/wards
router.get('/', async (req, res, next) => {
  try {
    const { projectId, district, search } = req.query as any;

    const where: any = {};
    if (projectId) {
      where.projectId = projectId;
    }
    if (district) {
      where.district = { contains: district, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { wardName: { contains: search, mode: 'insensitive' } },
        { wardNumber: { contains: search, mode: 'insensitive' } },
        { localBodyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const wards = await prisma.bLiffeWard.findMany({
      where,
      orderBy: { wardNumber: 'asc' },
    });

    const result: Ward[] = wards.map((w) => ({
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
      syncStatus: w.syncStatus as any,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/wards
router.post('/', async (req, res, next) => {
  try {
    const input = CreateWardSchema.parse(req.body);
    const id = input.id || crypto.randomUUID();

    const created = await prisma.bLiffeWard.create({
      data: {
        id,
        projectId: input.projectId,
        wardNumber: input.wardNumber.trim(),
        wardName: input.wardName.trim(),
        localBodyName: input.localBodyName?.trim() || '',
        district: input.district?.trim() || '',
        state: input.state?.trim() || '',
        keyLandmarks: input.keyLandmarks?.trim() || '',
        syncStatus: input.syncStatus || 'synced',
      },
    });

    const ward: Ward = {
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
      syncStatus: created.syncStatus as any,
    };

    res.status(201).json(ward);
  } catch (err) {
    next(err);
  }
});

// GET /api/wards/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const ward = await prisma.bLiffeWard.findUnique({
      where: { id },
    });

    if (!ward) {
      res.status(404).json({ error: 'Ward not found' });
      return;
    }

    const result: Ward = {
      id: ward.id,
      projectId: ward.projectId,
      wardNumber: ward.wardNumber,
      wardName: ward.wardName,
      localBodyName: ward.localBodyName || '',
      district: ward.district || '',
      state: ward.state || '',
      keyLandmarks: ward.keyLandmarks || '',
      createdAt: ward.createdAt.toISOString(),
      updatedAt: ward.updatedAt.toISOString(),
      syncStatus: ward.syncStatus as any,
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/wards/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const input = UpdateWardSchema.parse(req.body);

    const existing = await prisma.bLiffeWard.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Ward not found' });
      return;
    }

    const updated = await prisma.bLiffeWard.update({
      where: { id },
      data: {
        ...(input.wardNumber !== undefined && { wardNumber: input.wardNumber.trim() }),
        ...(input.wardName !== undefined && { wardName: input.wardName.trim() }),
        ...(input.localBodyName !== undefined && { localBodyName: input.localBodyName?.trim() || '' }),
        ...(input.district !== undefined && { district: input.district?.trim() || '' }),
        ...(input.state !== undefined && { state: input.state?.trim() || '' }),
        ...(input.keyLandmarks !== undefined && { keyLandmarks: input.keyLandmarks?.trim() || '' }),
        ...(input.syncStatus !== undefined && { syncStatus: input.syncStatus }),
      },
    });

    const ward: Ward = {
      id: updated.id,
      projectId: updated.projectId,
      wardNumber: updated.wardNumber,
      wardName: updated.wardName,
      localBodyName: updated.localBodyName || '',
      district: updated.district || '',
      state: updated.state || '',
      keyLandmarks: updated.keyLandmarks || '',
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      syncStatus: updated.syncStatus as any,
    };

    res.json(ward);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/wards/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.bLiffeWard.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Ward not found' });
      return;
    }

    await prisma.bLiffeWard.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: 'Ward deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;

