import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../db/client';
import {
  SyncPayloadSchema,
  SyncResponse,
  SyncStatusResponse,
} from '../schemas/bliffe';
import { TVM_WARDS } from '../services/wardService';

const router = Router();

// POST /api/sync
router.post('/', async (req, res, next) => {
  try {
    const payload = SyncPayloadSchema.parse(req.body);
    let syncedProjects = 0;
    let syncedWards = 0;
    let syncedSurveys = 0;
    let syncedObservations = 0;

    // 1. Sync Projects
    for (const p of payload.projects) {
      const id = p.id || crypto.randomUUID();
      await prisma.bLiffeProject.upsert({
        where: { id },
        create: {
          id,
          name: p.name.trim(),
          description: p.description?.trim() || '',
          startDate: p.startDate || null,
          status: p.status || 'active',
          organization: p.organization?.trim() || '',
          targetRegion: p.targetRegion?.trim() || '',
          syncStatus: 'synced',
        },
        update: {
          name: p.name.trim(),
          description: p.description?.trim() || '',
          status: p.status || 'active',
          organization: p.organization?.trim() || '',
          targetRegion: p.targetRegion?.trim() || '',
          syncStatus: 'synced',
        },
      });
      syncedProjects++;
    }

    // 2. Sync Wards
    for (const w of payload.wards) {
      const id = w.id || crypto.randomUUID();
      await prisma.bLiffeWard.upsert({
        where: { id },
        create: {
          id,
          projectId: w.projectId,
          wardNumber: w.wardNumber.trim(),
          wardName: w.wardName.trim(),
          localBodyName: w.localBodyName?.trim() || '',
          district: w.district?.trim() || '',
          state: w.state?.trim() || '',
          keyLandmarks: w.keyLandmarks?.trim() || '',
          syncStatus: 'synced',
        },
        update: {
          wardNumber: w.wardNumber.trim(),
          wardName: w.wardName.trim(),
          localBodyName: w.localBodyName?.trim() || '',
          district: w.district?.trim() || '',
          state: w.state?.trim() || '',
          keyLandmarks: w.keyLandmarks?.trim() || '',
          syncStatus: 'synced',
        },
      });
      syncedWards++;
    }

    // 3. Sync Surveys
    for (const s of payload.surveys) {
      const id = s.id || crypto.randomUUID();
      await prisma.bLiffeSurvey.upsert({
        where: { id },
        create: {
          id,
          projectId: s.projectId,
          wardId: s.wardId,
          leadObserver: s.leadObserver.trim(),
          teamMembers: s.teamMembers || [],
          surveyMethod: s.surveyMethod || 'Opportunistic Encounter',
          habitatType: s.habitatType || 'Urban Park / Garden',
          targetGroup: s.targetGroup || 'All Biodiversity',
          startTime: s.startTime,
          endTime: s.endTime || null,
          weatherNotes: s.weatherNotes?.trim() || '',
          syncStatus: 'synced',
        },
        update: {
          leadObserver: s.leadObserver.trim(),
          teamMembers: s.teamMembers || [],
          surveyMethod: s.surveyMethod,
          habitatType: s.habitatType,
          targetGroup: s.targetGroup,
          startTime: s.startTime,
          endTime: s.endTime || null,
          weatherNotes: s.weatherNotes?.trim() || '',
          syncStatus: 'synced',
        },
      });
      syncedSurveys++;
    }

    // 4. Sync Observations
    for (const o of payload.observations) {
      const id = o.id || crypto.randomUUID();

      let effectiveProjectId = o.projectId || null;
      if (effectiveProjectId) {
        const proj = await prisma.bLiffeProject.findUnique({ where: { id: effectiveProjectId } });
        if (!proj) {
          await prisma.bLiffeProject.create({
            data: {
              id: effectiveProjectId,
              name: 'Synced Field Project',
              status: 'active',
              syncStatus: 'synced',
            },
          });
        }
      }

      let effectiveWardId = o.wardId || null;
      if (effectiveWardId) {
        const ward = await prisma.bLiffeWard.findUnique({ where: { id: effectiveWardId } });
        if (!ward) {
          let projectForWard = effectiveProjectId;
          if (!projectForWard) {
            let defaultProj = await prisma.bLiffeProject.findFirst();
            if (!defaultProj) {
              defaultProj = await prisma.bLiffeProject.create({
                data: {
                  id: 'proj-tvm-biodiversity-2026',
                  name: 'Thiruvananthapuram City Biodiversity Register',
                  status: 'active',
                  syncStatus: 'synced',
                },
              });
            }
            projectForWard = defaultProj.id;
            effectiveProjectId = defaultProj.id;
          }
          const matchedRef = TVM_WARDS.find((w) => w.wardId === effectiveWardId);
          await prisma.bLiffeWard.create({
            data: {
              id: effectiveWardId,
              projectId: projectForWard,
              wardNumber: matchedRef?.wardNumber || o.wardName?.match(/\d+/)?.[0] || '14',
              wardName: matchedRef?.wardName || o.wardName || 'Palayam',
              localBodyName: matchedRef?.localBodyName || 'Thiruvananthapuram Municipal Corporation',
              district: 'Thiruvananthapuram',
              state: 'Kerala',
              syncStatus: 'synced',
            },
          });
        }
      }

      let effectiveSurveyId = o.surveyId || null;
      if (effectiveSurveyId) {
        const surv = await prisma.bLiffeSurvey.findUnique({ where: { id: effectiveSurveyId } });
        if (!surv) {
          if (effectiveProjectId && effectiveWardId) {
            await prisma.bLiffeSurvey.create({
              data: {
                id: effectiveSurveyId,
                projectId: effectiveProjectId,
                wardId: effectiveWardId,
                leadObserver: 'Field Researcher',
                startTime: o.observationAt || new Date().toISOString(),
                syncStatus: 'synced',
              },
            });
          } else {
            effectiveSurveyId = null;
          }
        }
      }

      await prisma.bLiffeObservation.upsert({
        where: { id },
        create: {
          id,
          surveyId: effectiveSurveyId,
          wardId: effectiveWardId,
          wardName: o.wardName || null,
          projectId: effectiveProjectId,
          projectIds: o.projectIds || (effectiveProjectId ? [effectiveProjectId] : []),
          speciesName: o.speciesName.trim(),
          scientificName: o.scientificName?.trim() || '',
          localName: o.localName?.trim() || '',
          speciesGroup: o.speciesGroup?.trim() || '',
          speciesGroups: o.speciesGroups?.trim() || '',
          otherSpeciesGroup: o.otherSpeciesGroup?.trim() || '',
          identificationStatus: o.identificationStatus || 'Identified',
          organismStatus: o.organismStatus || 'Wild',
          locationVisibility: o.locationVisibility || 'Open',
          basis_of_record: o.basis_of_record || 'HumanObservation',
          tags: o.tags || [],
          notes: o.notes?.trim() || '',
          individualCount: o.individualCount ?? 1,
          lifeStage: o.lifeStage?.trim() || '',
          microHabitat: o.microHabitat?.trim() || '',
          otherMicroHabitat: o.otherMicroHabitat?.trim() || '',
          hasTraditionalKnowledge: o.hasTraditionalKnowledge || 'No',
          traditionalKnowledgeSource: o.traditionalKnowledgeSource?.trim() || '',
          otherTraditionalKnowledgeSource: o.otherTraditionalKnowledgeSource?.trim() || '',
          gps_latitude: o.gps_latitude ?? null,
          gps_longitude: o.gps_longitude ?? null,
          latitude: o.latitude ?? null,
          longitude: o.longitude ?? null,
          location_source: o.location_source || 'GPS',
          accuracyMeters: o.accuracyMeters ?? null,
          observationAt: o.observationAt || new Date().toISOString(),
          recordedAt: o.recordedAt || new Date().toISOString(),
          photos: o.photos || (o.photo ? [o.photo] : []),
          verificationStatus: o.verificationStatus || 'Unreviewed',
          verifiedBy: o.verifiedBy?.trim() || '',
          verificationNotes: o.verificationNotes?.trim() || '',
          syncStatus: 'synced',
        },
        update: {
          speciesName: o.speciesName.trim(),
          scientificName: o.scientificName?.trim() || '',
          localName: o.localName?.trim() || '',
          speciesGroup: o.speciesGroup?.trim() || '',
          notes: o.notes?.trim() || '',
          tags: o.tags || [],
          latitude: o.latitude ?? null,
          longitude: o.longitude ?? null,
          syncStatus: 'synced',
        },
      });
      syncedObservations++;
    }

    const response: SyncResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      synced: {
        projects: syncedProjects,
        wards: syncedWards,
        surveys: syncedSurveys,
        observations: syncedObservations,
      },
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// GET /api/sync/status
router.get('/status', async (_req, res, next) => {
  try {
    const [projectCount, wardCount, surveyCount, observationCount] = await Promise.all([
      prisma.bLiffeProject.count(),
      prisma.bLiffeWard.count(),
      prisma.bLiffeSurvey.count(),
      prisma.bLiffeObservation.count(),
    ]);

    const response: SyncStatusResponse = {
      status: 'online',
      timestamp: new Date().toISOString(),
      counts: {
        projects: projectCount,
        wards: wardCount,
        surveys: surveyCount,
        observations: observationCount,
      },
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;

