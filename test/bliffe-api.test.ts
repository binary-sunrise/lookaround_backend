import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { app } from '../src/app';
import { prisma, pool } from '../src/db/client';

describe('B-Liffe Backend API & Contract Test Suite', { timeout: 60000 }, () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    if (pool) {
      await pool.end();
    }
    await prisma.$disconnect();
  });

  // Unique IDs for isolated test execution
  const testRunId = crypto.randomBytes(4).toString('hex');
  const testUserEmail = `researcher_${testRunId}@field.b-liffe.org`;
  let authToken: string;
  let testProjectId: string;
  let testWardId: string;
  let testSurveyId: string;
  let testObservationId: string;

  // ==========================================
  // 1. Authentication & Profile Endpoints
  // ==========================================
  describe('Authentication & Profile Contracts', () => {
    test('POST /api/auth/register creates user account and UserProfile', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Dr. Jane Goodall',
          email: testUserEmail,
          password: 'secureFieldPassword2026!',
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.token, 'Expected session token');
      authToken = data.token;

      assert.ok(data.user, 'Expected user profile');
      assert.equal(data.user.fullName, 'Dr. Jane Goodall');
      assert.equal(data.user.displayName, 'Dr.');
      assert.equal(data.user.email, testUserEmail);
      assert.equal(data.user.avatarPresetId, 'user');
    });

    test('POST /api/auth/login authenticates registered user', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUserEmail,
          password: 'secureFieldPassword2026!',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.token);
      assert.equal(data.user.email, testUserEmail);
    });

    test('GET /api/auth/me returns authenticated researcher profile', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const profile = await res.json();
      assert.equal(profile.fullName, 'Dr. Jane Goodall');
    });

    test('GET /api/v1/profile returns profile conforming to frontend contract', async () => {
      const res = await fetch(`${baseUrl}/api/v1/profile`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      assert.equal(res.status, 200);
      const profile = await res.json();
      assert.ok(profile.id);
      assert.ok(profile.fullName);
      assert.ok(profile.avatarPresetId);
    });

    test('PUT /api/v1/profile updates profile fields', async () => {
      const res = await fetch(`${baseUrl}/api/v1/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fullName: 'Dr. Jane Goodall DBE',
          displayName: 'Jane',
          bio: 'Primatologist and anthropologist.',
          avatarType: 'preset',
          avatarPresetId: 'butterfly',
        }),
      });

      assert.equal(res.status, 200);
      const updated = await res.json();
      assert.equal(updated.fullName, 'Dr. Jane Goodall DBE');
      assert.equal(updated.displayName, 'Jane');
      assert.equal(updated.avatarPresetId, 'butterfly');
    });
  });

  // ==========================================
  // 2. Projects Endpoints
  // ==========================================
  describe('Project Contracts (/api/projects)', () => {
    test('POST /api/projects creates project matching B-Liffe contract', async () => {
      const newProject = {
        name: `Thiruvananthapuram Urban Ecology Campaign ${testRunId}`,
        description: 'Comprehensive municipal ward-level documentation of urban flora and fauna.',
        organization: 'Kerala State Biodiversity Board',
        targetRegion: 'Thiruvananthapuram District',
        status: 'active',
      };

      const res = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.id, 'Expected generated UUID id');
      testProjectId = data.id;
      assert.equal(data.name, newProject.name);
      assert.equal(data.status, 'active');
      assert.equal(data.organization, newProject.organization);
      assert.equal(data.syncStatus, 'synced');
    });

    test('GET /api/projects lists projects with counts and supports search query', async () => {
      const res = await fetch(`${baseUrl}/api/projects?search=${testRunId}`);
      assert.equal(res.status, 200);
      const projects = await res.json();
      assert.ok(Array.isArray(projects));
      assert.ok(projects.length >= 1);
      assert.equal(projects[0].id, testProjectId);
      assert.ok(typeof projects[0].wardCount === 'number');
      assert.ok(typeof projects[0].surveyCount === 'number');
      assert.ok(typeof projects[0].observationCount === 'number');
    });

    test('GET /api/projects/:id returns full project details with wards and surveys', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${testProjectId}`);
      assert.equal(res.status, 200);
      const project = await res.json();
      assert.equal(project.id, testProjectId);
      assert.ok(Array.isArray(project.wards));
      assert.ok(Array.isArray(project.surveys));
    });

    test('PUT /api/projects/:id updates project attributes', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${testProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Updated field initiative notes.',
          status: 'completed',
        }),
      });

      assert.equal(res.status, 200);
      const updated = await res.json();
      assert.equal(updated.status, 'completed');
      assert.equal(updated.description, 'Updated field initiative notes.');
    });
  });

  // ==========================================
  // 3. Wards & GIS Endpoints
  // ==========================================
  describe('Wards & GIS Boundary Matching (/api/wards)', () => {
    test('POST /api/wards/identify accurately identifies ward from GPS coordinates', async () => {
      // Palayam coordinates in Thiruvananthapuram
      const res = await fetch(`${baseUrl}/api/wards/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: 8.4982,
          longitude: 76.9534,
        }),
      });

      assert.equal(res.status, 200);
      const result = await res.json();
      assert.equal(result.status, 'ward_identified');
      assert.ok(result.ward);
      assert.equal(result.ward.wardNumber, '14');
      assert.equal(result.ward.wardName, 'Palayam');
    });

    test('POST /api/wards/identify returns ward_unidentified for distant coordinates', async () => {
      const res = await fetch(`${baseUrl}/api/wards/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: 51.5074,
          longitude: -0.1278, // London
        }),
      });

      assert.equal(res.status, 200);
      const result = await res.json();
      assert.equal(result.status, 'ward_unidentified');
    });

    test('POST /api/wards creates administrative ward for project', async () => {
      const newWard = {
        projectId: testProjectId,
        wardNumber: '14',
        wardName: 'Palayam',
        localBodyName: 'Thiruvananthapuram Municipal Corporation',
        district: 'Thiruvananthapuram',
        state: 'Kerala',
        keyLandmarks: 'University Stadium, Public Library',
      };

      const res = await fetch(`${baseUrl}/api/wards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWard),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.id);
      testWardId = data.id;
      assert.equal(data.wardNumber, '14');
      assert.equal(data.wardName, 'Palayam');
    });

    test('GET /api/projects/:projectId/wards lists wards for project', async () => {
      const res = await fetch(`${baseUrl}/api/projects/${testProjectId}/wards`);
      assert.equal(res.status, 200);
      const wards = await res.json();
      assert.ok(Array.isArray(wards));
      assert.ok(wards.some((w: any) => w.id === testWardId));
    });
  });

  // ==========================================
  // 4. Surveys Endpoints
  // ==========================================
  describe('Surveys Contracts (/api/surveys)', () => {
    test('POST /api/surveys records a field survey session', async () => {
      const newSurvey = {
        projectId: testProjectId,
        wardId: testWardId,
        leadObserver: 'Dr. Jane Goodall',
        teamMembers: ['Veena V', 'Field Assistant A'],
        surveyMethod: 'Line Transect',
        habitatType: 'Urban Park / Garden',
        targetGroup: 'All Biodiversity',
        startTime: new Date().toISOString(),
        weatherNotes: 'Clear sky, 28°C, slight breeze',
      };

      const res = await fetch(`${baseUrl}/api/surveys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSurvey),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.id);
      testSurveyId = data.id;
      assert.equal(data.leadObserver, 'Dr. Jane Goodall');
      assert.equal(data.surveyMethod, 'Line Transect');
    });

    test('GET /api/surveys filters by projectId and wardId', async () => {
      const res = await fetch(
        `${baseUrl}/api/surveys?projectId=${testProjectId}&wardId=${testWardId}`
      );
      assert.equal(res.status, 200);
      const surveys = await res.json();
      assert.ok(Array.isArray(surveys));
      assert.ok(surveys.some((s: any) => s.id === testSurveyId));
    });
  });

  // ==========================================
  // 5. Observations Endpoints
  // ==========================================
  describe('Observations Contracts (/api/observations)', () => {
    test('POST /api/observations creates Darwin Core aligned record', async () => {
      const newObs = {
        projectId: testProjectId,
        wardId: testWardId,
        surveyId: testSurveyId,
        speciesName: 'Southern Birdwing',
        scientificName: 'Troides minos',
        localName: 'ഗരുഡശലഭം',
        speciesGroup: 'Insects',
        identificationStatus: 'Identified',
        organismStatus: 'Wild',
        locationVisibility: 'Open',
        basis_of_record: 'HumanObservation',
        tags: ['pollinator', 'canopy-dwelling', 'state-butterfly'],
        notes: 'Observed nectaring on Pagoda flower in the afternoon.',
        individualCount: 2,
        lifeStage: 'Adult',
        microHabitat: 'Tree Canopy',
        hasTraditionalKnowledge: 'Yes',
        traditionalKnowledgeSource: 'Elder / knowledgeable local resident',
        latitude: 8.4982,
        longitude: 76.9534,
        accuracyMeters: 4.5,
        location_source: 'GPS',
        observationAt: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
        photos: ['https://example.com/photos/birdwing.jpg'],
      };

      const res = await fetch(`${baseUrl}/api/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newObs),
      });

      assert.equal(res.status, 201);
      const obs = await res.json();
      assert.ok(obs.id);
      testObservationId = obs.id;
      assert.equal(obs.speciesName, 'Southern Birdwing');
      assert.equal(obs.scientificName, 'Troides minos');
      assert.equal(obs.localName, 'ഗരുഡശലഭം');
      assert.equal(obs.basis_of_record, 'HumanObservation');
      assert.equal(obs.individualCount, 2);
      assert.deepEqual(obs.tags, ['pollinator', 'canopy-dwelling', 'state-butterfly']);
    });

    test('GET /api/observations filters by tag and search query', async () => {
      const res = await fetch(
        `${baseUrl}/api/observations?tag=pollinator&search=Birdwing`
      );
      assert.equal(res.status, 200);
      const list = await res.json();
      assert.ok(Array.isArray(list));
      assert.ok(list.some((o: any) => o.id === testObservationId));
    });

    test('PUT /api/observations/:id updates verification status and notes', async () => {
      const res = await fetch(`${baseUrl}/api/observations/${testObservationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationStatus: 'Validated',
          verifiedBy: 'Expert Entomologist Dr. Jane',
          verificationNotes: 'Identification confirmed via distinctive wing pattern.',
        }),
      });

      assert.equal(res.status, 200);
      const updated = await res.json();
      assert.equal(updated.verificationStatus, 'Validated');
      assert.equal(updated.verifiedBy, 'Expert Entomologist Dr. Jane');
    });
  });

  // ==========================================
  // 6. Offline Sync Endpoints
  // ==========================================
  describe('Offline Sync Contracts (/api/sync)', () => {
    test('POST /api/sync batch-upserts offline Dexie stores', async () => {
      const syncBatchId = crypto.randomUUID();
      const offlinePayload = {
        projects: [
          {
            id: `proj-offline-${syncBatchId}`,
            name: `Offline Synced Forest Project ${syncBatchId}`,
            status: 'active',
          },
        ],
        wards: [
          {
            id: `ward-offline-${syncBatchId}`,
            projectId: `proj-offline-${syncBatchId}`,
            wardNumber: '99',
            wardName: 'Forest Boundary Ward',
          },
        ],
        surveys: [
          {
            id: `survey-offline-${syncBatchId}`,
            projectId: `proj-offline-${syncBatchId}`,
            wardId: `ward-offline-${syncBatchId}`,
            leadObserver: 'Offline Field Worker',
            startTime: new Date().toISOString(),
          },
        ],
        observations: [
          {
            id: `obs-offline-${syncBatchId}`,
            projectId: `proj-offline-${syncBatchId}`,
            wardId: `ward-offline-${syncBatchId}`,
            surveyId: `survey-offline-${syncBatchId}`,
            speciesName: 'Malabar Gliding Frog',
            scientificName: 'Rhacophorus malabaricus',
            basis_of_record: 'HumanObservation',
            notes: 'Found perched on an Arum leaf after monsoon drizzle.',
            observationAt: new Date().toISOString(),
            recordedAt: new Date().toISOString(),
          },
        ],
      };

      const res = await fetch(`${baseUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offlinePayload),
      });

      assert.equal(res.status, 200);
      const syncResult = await res.json();
      assert.equal(syncResult.success, true);
      assert.equal(syncResult.synced.projects, 1);
      assert.equal(syncResult.synced.wards, 1);
      assert.equal(syncResult.synced.surveys, 1);
      assert.equal(syncResult.synced.observations, 1);
    });

    test('GET /api/sync/status returns online status and counts', async () => {
      const res = await fetch(`${baseUrl}/api/sync/status`);
      assert.equal(res.status, 200);
      const status = await res.json();
      assert.equal(status.status, 'online');
      assert.ok(status.counts.projects > 0);
      assert.ok(status.counts.wards > 0);
      assert.ok(status.counts.surveys > 0);
      assert.ok(status.counts.observations > 0);
    });
  });

  // ==========================================
  // 7. Darwin Core Export Endpoint
  // ==========================================
  describe('Darwin Core Standard Export (/api/export/dwc)', () => {
    test('GET /api/export/dwc produces valid DwC occurrence records', async () => {
      const res = await fetch(`${baseUrl}/api/export/dwc?projectId=${testProjectId}`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(typeof data.exportDate === 'string');
      assert.ok(Array.isArray(data.records));
      assert.ok(data.records.length >= 1);

      const record = data.records.find(
        (r: any) => r['dwc:occurrenceID'] === testObservationId
      );
      assert.ok(record, 'Expected newly created observation in DwC export');
      assert.equal(record['dwc:scientificName'], 'Troides minos');
      assert.equal(record['dwc:basisOfRecord'], 'HumanObservation');
      assert.equal(record['dwc:decimalLatitude'], 8.4982);
      assert.equal(record['dwc:decimalLongitude'], 76.9534);

      // Verify dynamic properties encapsulation
      const dynamicProps = JSON.parse(record['dwc:dynamicProperties']);
      assert.ok(Array.isArray(dynamicProps.tags));
      assert.equal(dynamicProps.organismStatus, 'Wild');
    });
  });
});

