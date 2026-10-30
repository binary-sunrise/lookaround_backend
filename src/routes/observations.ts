import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../db/client';
import {
  CreateObservationSchema,
  UpdateObservationSchema,
  Observation,
} from '../schemas/bliffe';

const router = Router();

export function mapPrismaToObservation(obs: any): Observation {
  return {
    id: obs.id,
    surveyId: obs.surveyId || undefined,
    wardId: obs.wardId || undefined,
    wardName: obs.wardName || undefined,
    projectId: obs.projectId || undefined,
    projectIds: obs.projectIds || [],
    speciesName: obs.speciesName,
    scientificName: obs.scientificName || undefined,
    localName: obs.localName || undefined,
    speciesGroup: obs.speciesGroup || undefined,
    speciesGroups: obs.speciesGroups || undefined,
    otherSpeciesGroup: obs.otherSpeciesGroup || undefined,
    identificationStatus: obs.identificationStatus as any,
    organismStatus: obs.organismStatus as any,
    locationVisibility: obs.locationVisibility as any,
    basis_of_record: obs.basis_of_record as any,
    tags: obs.tags || [],
    notes: obs.notes || '',
    individualCount: obs.individualCount,
    lifeStage: obs.lifeStage || undefined,
    microHabitat: obs.microHabitat || undefined,
    otherMicroHabitat: obs.otherMicroHabitat || undefined,
    hasTraditionalKnowledge: obs.hasTraditionalKnowledge as any,
    traditionalKnowledgeSource: obs.traditionalKnowledgeSource || undefined,
    otherTraditionalKnowledgeSource: obs.otherTraditionalKnowledgeSource || undefined,
    gps_latitude: obs.gps_latitude,
    gps_longitude: obs.gps_longitude,
    latitude: obs.latitude,
    longitude: obs.longitude,
    location_source: obs.location_source as any,
    accuracyMeters: obs.accuracyMeters,
    observationAt: obs.observationAt,
    recordedAt: obs.recordedAt,
    photos: obs.photos || [],
    verificationStatus: obs.verificationStatus as any,
    verifiedBy: obs.verifiedBy || undefined,
    verificationNotes: obs.verificationNotes || undefined,
    syncStatus: obs.syncStatus as any,
    userId: obs.userId || undefined,
    createdAt: obs.createdAt ? obs.createdAt.toISOString() : undefined,
    updatedAt: obs.updatedAt ? obs.updatedAt.toISOString() : undefined,
  };
}

// GET /api/observations
router.get('/', async (req, res, next) => {
  try {
    const {
      projectId,
      wardId,
      surveyId,
      status,
      identificationStatus,
      organismStatus,
      tag,
      search,
      q,
      limit,
      offset,
    } = req.query as any;

    const where: any = {};

    if (projectId) {
      where.OR = [
        { projectId },
        { projectIds: { has: projectId } },
      ];
    }
    if (wardId) {
      where.wardId = wardId;
    }
    if (surveyId) {
      where.surveyId = surveyId;
    }

    const filterStatus = status || identificationStatus;
    if (filterStatus && filterStatus !== 'All') {
      where.identificationStatus = filterStatus;
    }

    if (organismStatus && organismStatus !== 'All') {
      where.organismStatus = organismStatus;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    const searchTerm = search || q;
    if (searchTerm) {
      where.OR = [
        ...(where.OR || []),
        { speciesName: { contains: searchTerm, mode: 'insensitive' } },
        { scientificName: { contains: searchTerm, mode: 'insensitive' } },
        { localName: { contains: searchTerm, mode: 'insensitive' } },
        { notes: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const take = limit ? Math.min(Number(limit), 200) : 100;
    const skip = offset ? Number(offset) : 0;

    const observations = await prisma.bLiffeObservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    res.json(observations.map(mapPrismaToObservation));
  } catch (err) {
    next(err);
  }
});

// POST /api/observations
router.post('/', async (req, res, next) => {
  try {
    const input = CreateObservationSchema.parse(req.body);
    const id = input.id || crypto.randomUUID();
    const userId = (req as any).userId || input.userId || null;

    const created = await prisma.bLiffeObservation.create({
      data: {
        id,
        surveyId: input.surveyId || null,
        wardId: input.wardId || null,
        wardName: input.wardName || null,
        projectId: input.projectId || null,
        projectIds: input.projectIds || (input.projectId ? [input.projectId] : []),
        speciesName: input.speciesName.trim(),
        scientificName: input.scientificName?.trim() || '',
        localName: input.localName?.trim() || '',
        speciesGroup: input.speciesGroup?.trim() || '',
        speciesGroups: input.speciesGroups?.trim() || '',
        otherSpeciesGroup: input.otherSpeciesGroup?.trim() || '',
        identificationStatus: input.identificationStatus || 'Identified',
        organismStatus: input.organismStatus || 'Wild',
        locationVisibility: input.locationVisibility || 'Open',
        basis_of_record: input.basis_of_record || 'HumanObservation',
        tags: input.tags || [],
        notes: input.notes?.trim() || '',
        individualCount: input.individualCount ?? 1,
        lifeStage: input.lifeStage?.trim() || '',
        microHabitat: input.microHabitat?.trim() || '',
        otherMicroHabitat: input.otherMicroHabitat?.trim() || '',
        hasTraditionalKnowledge: input.hasTraditionalKnowledge || 'No',
        traditionalKnowledgeSource: input.traditionalKnowledgeSource?.trim() || '',
        otherTraditionalKnowledgeSource: input.otherTraditionalKnowledgeSource?.trim() || '',
        gps_latitude: input.gps_latitude ?? null,
        gps_longitude: input.gps_longitude ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        location_source: input.location_source || 'GPS',
        accuracyMeters: input.accuracyMeters ?? null,
        observationAt: input.observationAt || new Date().toISOString(),
        recordedAt: input.recordedAt || new Date().toISOString(),
        photos: input.photos || (input.photo ? [input.photo] : []),
        verificationStatus: input.verificationStatus || 'Unreviewed',
        verifiedBy: input.verifiedBy?.trim() || '',
        verificationNotes: input.verificationNotes?.trim() || '',
        syncStatus: input.syncStatus || 'synced',
        userId,
      },
    });

    res.status(201).json(mapPrismaToObservation(created));
  } catch (err) {
    next(err);
  }
});

// GET /api/observations/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const obs = await prisma.bLiffeObservation.findUnique({
      where: { id },
    });

    if (!obs) {
      res.status(404).json({ error: 'Observation not found' });
      return;
    }

    res.json(mapPrismaToObservation(obs));
  } catch (err) {
    next(err);
  }
});

// PUT /api/observations/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const input = UpdateObservationSchema.parse(req.body);

    const existing = await prisma.bLiffeObservation.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Observation not found' });
      return;
    }

    const updated = await prisma.bLiffeObservation.update({
      where: { id },
      data: {
        ...(input.speciesName !== undefined && { speciesName: input.speciesName.trim() }),
        ...(input.scientificName !== undefined && { scientificName: input.scientificName?.trim() || '' }),
        ...(input.localName !== undefined && { localName: input.localName?.trim() || '' }),
        ...(input.speciesGroup !== undefined && { speciesGroup: input.speciesGroup?.trim() || '' }),
        ...(input.speciesGroups !== undefined && { speciesGroups: input.speciesGroups?.trim() || '' }),
        ...(input.otherSpeciesGroup !== undefined && { otherSpeciesGroup: input.otherSpeciesGroup?.trim() || '' }),
        ...(input.identificationStatus !== undefined && { identificationStatus: input.identificationStatus }),
        ...(input.organismStatus !== undefined && { organismStatus: input.organismStatus }),
        ...(input.locationVisibility !== undefined && { locationVisibility: input.locationVisibility }),
        ...(input.basis_of_record !== undefined && { basis_of_record: input.basis_of_record }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.notes !== undefined && { notes: input.notes?.trim() || '' }),
        ...(input.individualCount !== undefined && { individualCount: input.individualCount }),
        ...(input.lifeStage !== undefined && { lifeStage: input.lifeStage?.trim() || '' }),
        ...(input.microHabitat !== undefined && { microHabitat: input.microHabitat?.trim() || '' }),
        ...(input.otherMicroHabitat !== undefined && { otherMicroHabitat: input.otherMicroHabitat?.trim() || '' }),
        ...(input.hasTraditionalKnowledge !== undefined && { hasTraditionalKnowledge: input.hasTraditionalKnowledge }),
        ...(input.traditionalKnowledgeSource !== undefined && { traditionalKnowledgeSource: input.traditionalKnowledgeSource?.trim() || '' }),
        ...(input.otherTraditionalKnowledgeSource !== undefined && { otherTraditionalKnowledgeSource: input.otherTraditionalKnowledgeSource?.trim() || '' }),
        ...(input.gps_latitude !== undefined && { gps_latitude: input.gps_latitude }),
        ...(input.gps_longitude !== undefined && { gps_longitude: input.gps_longitude }),
        ...(input.latitude !== undefined && { latitude: input.latitude }),
        ...(input.longitude !== undefined && { longitude: input.longitude }),
        ...(input.location_source !== undefined && { location_source: input.location_source }),
        ...(input.accuracyMeters !== undefined && { accuracyMeters: input.accuracyMeters }),
        ...(input.photos !== undefined && { photos: input.photos }),
        ...(input.verificationStatus !== undefined && { verificationStatus: input.verificationStatus }),
        ...(input.verifiedBy !== undefined && { verifiedBy: input.verifiedBy?.trim() || '' }),
        ...(input.verificationNotes !== undefined && { verificationNotes: input.verificationNotes?.trim() || '' }),
        ...(input.syncStatus !== undefined && { syncStatus: input.syncStatus }),
        ...(input.projectId !== undefined && { projectId: input.projectId }),
        ...(input.projectIds !== undefined && { projectIds: input.projectIds }),
        ...(input.wardId !== undefined && { wardId: input.wardId }),
        ...(input.wardName !== undefined && { wardName: input.wardName }),
        ...(input.surveyId !== undefined && { surveyId: input.surveyId }),
      },
    });

    res.json(mapPrismaToObservation(updated));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/observations/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.bLiffeObservation.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Observation not found' });
      return;
    }

    await prisma.bLiffeObservation.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: 'Observation deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/observations/batch
router.post('/batch', async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.observations || [];
    let count = 0;

    for (const raw of items) {
      const parsed = CreateObservationSchema.parse(raw);
      const id = parsed.id || crypto.randomUUID();
      await prisma.bLiffeObservation.upsert({
        where: { id },
        create: {
          id,
          surveyId: parsed.surveyId || null,
          wardId: parsed.wardId || null,
          wardName: parsed.wardName || null,
          projectId: parsed.projectId || null,
          projectIds: parsed.projectIds || (parsed.projectId ? [parsed.projectId] : []),
          speciesName: parsed.speciesName.trim(),
          scientificName: parsed.scientificName?.trim() || '',
          localName: parsed.localName?.trim() || '',
          speciesGroup: parsed.speciesGroup?.trim() || '',
          speciesGroups: parsed.speciesGroups?.trim() || '',
          otherSpeciesGroup: parsed.otherSpeciesGroup?.trim() || '',
          identificationStatus: parsed.identificationStatus || 'Identified',
          organismStatus: parsed.organismStatus || 'Wild',
          locationVisibility: parsed.locationVisibility || 'Open',
          basis_of_record: parsed.basis_of_record || 'HumanObservation',
          tags: parsed.tags || [],
          notes: parsed.notes?.trim() || '',
          individualCount: parsed.individualCount ?? 1,
          lifeStage: parsed.lifeStage?.trim() || '',
          microHabitat: parsed.microHabitat?.trim() || '',
          otherMicroHabitat: parsed.otherMicroHabitat?.trim() || '',
          hasTraditionalKnowledge: parsed.hasTraditionalKnowledge || 'No',
          traditionalKnowledgeSource: parsed.traditionalKnowledgeSource?.trim() || '',
          otherTraditionalKnowledgeSource: parsed.otherTraditionalKnowledgeSource?.trim() || '',
          gps_latitude: parsed.gps_latitude ?? null,
          gps_longitude: parsed.gps_longitude ?? null,
          latitude: parsed.latitude ?? null,
          longitude: parsed.longitude ?? null,
          location_source: parsed.location_source || 'GPS',
          accuracyMeters: parsed.accuracyMeters ?? null,
          observationAt: parsed.observationAt || new Date().toISOString(),
          recordedAt: parsed.recordedAt || new Date().toISOString(),
          photos: parsed.photos || [],
          verificationStatus: parsed.verificationStatus || 'Unreviewed',
          verifiedBy: parsed.verifiedBy?.trim() || '',
          verificationNotes: parsed.verificationNotes?.trim() || '',
          syncStatus: 'synced',
        },
        update: {
          speciesName: parsed.speciesName.trim(),
          scientificName: parsed.scientificName?.trim() || '',
          localName: parsed.localName?.trim() || '',
          speciesGroup: parsed.speciesGroup?.trim() || '',
          notes: parsed.notes?.trim() || '',
          tags: parsed.tags || [],
          latitude: parsed.latitude ?? null,
          longitude: parsed.longitude ?? null,
          syncStatus: 'synced',
        },
      });
      count++;
    }

    res.status(200).json({ success: true, count });
  } catch (err) {
    next(err);
  }
});

export default router;
