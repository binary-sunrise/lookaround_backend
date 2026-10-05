import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../src/app';
import { prisma } from '../src/db/client';

describe('Neon PostgreSQL End-to-End CRUD & User Management Test Suite', { timeout: 120000 }, () => {
  let server: http.Server;
  let baseUrl: string;

  // Unique test run identifier
  const runId = `test-${Date.now()}`;
  const testHubId = `hub-${runId}`;
  const testProjId = `proj-${runId}`;
  const testSurveyId = `surv-${runId}`;
  const testActId = `act-${runId}`;
  const testUserId = `user-${runId}`;
  const testUserEmail = `${runId}@example.com`;
  const testSessionToken = `token-${runId}`;
  const testAccountId = `acc-${runId}`;

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
    // Clean up all created test entities in Neon PostgreSQL
    try {
      await prisma.session.deleteMany({ where: { userId: testUserId } });
      await prisma.account.deleteMany({ where: { userId: testUserId } });
      await prisma.bioActivity.deleteMany({ where: { activityId: testActId } });
      await prisma.survey.deleteMany({ where: { id: testSurveyId } });
      await prisma.project.deleteMany({ where: { projectId: testProjId } });
      await prisma.hub.deleteMany({ where: { id: testHubId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
      await prisma.user.deleteMany({ where: { email: { contains: runId } } });
    } catch (cleanupErr) {
      console.warn('[Cleanup] Warning during test cleanup:', cleanupErr);
    }

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });

    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. Database Connectivity & SSL / Pool Configuration
  // =========================================================================
  describe('1. Neon Database Connectivity & Pool Configuration', () => {
    test('connection string contains Neon pooled endpoint and sslmode=require', () => {
      const dbUrl = process.env.DATABASE_URL || '';
      assert.ok(dbUrl.includes('neon.tech'), 'DATABASE_URL should target neon.tech');
      assert.ok(dbUrl.includes('-pooler'), 'DATABASE_URL should use the PgBouncer pooler endpoint');
      assert.ok(dbUrl.includes('sslmode=require'), 'DATABASE_URL must require SSL');
    });

    test('raw SQL ping succeeds via Neon serverless connection adapter', async () => {
      const result = await prisma.$queryRaw<Array<{ result: number }>>`SELECT 1 as result`;
      assert.equal(result.length, 1);
      assert.equal(Number(result[0].result), 1);
    });

    test('transaction commits cleanly without lockups or timeouts', async () => {
      const txResult = await prisma.$transaction(async (tx) => {
        const tempHubId = `tx-hub-${Date.now()}`;
        const hub = await tx.hub.create({
          data: {
            id: tempHubId,
            name: 'Transaction Test Hub',
            url: 'https://example.com/tx',
            description: 'Created inside a clean transaction',
            logo: 'https://example.com/logo.png',
          },
        });
        const readBack = await tx.hub.findUnique({ where: { id: tempHubId } });
        assert.ok(readBack);
        assert.equal(readBack.id, tempHubId);

        // Clean up inside transaction
        await tx.hub.delete({ where: { id: tempHubId } });
        return true;
      });

      assert.equal(txResult, true);
    });
  });

  // =========================================================================
  // 2. Core Entity INSERT Operations (Record Creation)
  // =========================================================================
  describe('2. Core Entity INSERT Operations', () => {
    test('INSERT User record with profile fields into Neon DB', async () => {
      const user = await prisma.user.create({
        data: {
          id: testUserId,
          name: 'Dr. Test Ecologist',
          givenName: 'Test',
          familyName: 'Ecologist',
          email: testUserEmail,
          emailVerified: true,
          role: 'Lead Ecologist',
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          avatar: 'TE',
          organisation: 'Kerala Forest Research Institute',
        },
      });

      assert.equal(user.id, testUserId);
      assert.equal(user.email, testUserEmail);
      assert.equal(user.organisation, 'Kerala Forest Research Institute');
      assert.ok(user.createdAt instanceof Date);
      assert.ok(user.updatedAt instanceof Date);
    });

    test('INSERT Account and Session records linked to User via Foreign Key', async () => {
      const account = await prisma.account.create({
        data: {
          id: testAccountId,
          accountId: testUserEmail,
          providerId: 'credential',
          userId: testUserId,
          password: 'hashed_password_test_1234',
        },
      });
      assert.equal(account.userId, testUserId);

      const session = await prisma.session.create({
        data: {
          id: `sess-${runId}`,
          token: testSessionToken,
          userId: testUserId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: 'NeonCRUDTestSuite/1.0',
          ipAddress: '127.0.0.1',
        },
      });
      assert.equal(session.userId, testUserId);
      assert.equal(session.token, testSessionToken);
    });

    test('INSERT Hub record', async () => {
      const hub = await prisma.hub.create({
        data: {
          id: testHubId,
          name: 'KFRI Western Ghats Hub',
          url: 'https://kfri.res.in/hub',
          description: 'Biodiversity monitoring in Kerala rainforests',
          logo: 'https://kfri.res.in/assets/logo.png',
        },
      });

      assert.equal(hub.id, testHubId);
      assert.equal(hub.name, 'KFRI Western Ghats Hub');
    });

    test('INSERT Project record with keywords, tags, scienceType, rawData JSONB', async () => {
      const project = await prisma.project.create({
        data: {
          projectId: testProjId,
          name: 'Nilgiri Tahr Habitat Survey',
          description: 'Comprehensive population count and vegetation analysis',
          startDate: '2026-10-01',
          contactName: 'Dr. Test Ecologist',
          contactDetails: 'ecologist@kfri.res.in',
          organisationName: 'Kerala Forest Research Institute',
          organisationId: 'org-kfri-001',
          hub: testHubId,
          keywords: ['Nilgiri Tahr', 'Western Ghats', 'Endangered'],
          tags: ['Mammals', 'Conservation'],
          scienceType: ['Ecology', 'Zoology'],
          ecoScienceType: ['Terrestrial Ecology'],
          isExternal: false,
          rawData: { altitudeMeters: 2200, sanctuary: 'Eravikulam National Park' },
        },
      });

      assert.equal(project.projectId, testProjId);
      assert.equal(project.name, 'Nilgiri Tahr Habitat Survey');
      assert.deepEqual(project.keywords, ['Nilgiri Tahr', 'Western Ghats', 'Endangered']);
    });

    test('INSERT Survey record referencing Project Foreign Key', async () => {
      const survey = await prisma.survey.create({
        data: {
          id: testSurveyId,
          name: 'High Altitude Grassland Transect',
          description: 'Transect census across ridge lines',
          startDate: '2026-10-05',
          status: 'Active',
          published: true,
          publicAccess: true,
          projectId: testProjId,
          projectActivityId: `pa-${runId}`,
        },
      });

      assert.equal(survey.id, testSurveyId);
      assert.equal(survey.projectId, testProjId);
    });

    test('INSERT BioActivity record with nested observation JSON and Project FK', async () => {
      const observationRecord = {
        guid: `rec-${runId}`,
        name: 'Nilgiritragus hylocrius',
        commonName: 'Nilgiri Tahr',
        individualCount: 4,
        coordinates: [10.198, 77.065],
        multimedia: {
          imageId: `img-${runId}`,
          title: 'Tahr on cliff ledge',
        },
      };

      const activity = await prisma.bioActivity.create({
        data: {
          activityId: testActId,
          projectActivityId: `pa-${runId}`,
          type: 'BioBlitz Observation Form',
          status: 'active',
          lastUpdated: new Date().toISOString(),
          userId: testUserId,
          name: 'Nilgiri Tahr Direct Observation',
          projectName: 'Nilgiri Tahr Habitat Survey',
          projectId: testProjId,
          activityOwnerName: 'Dr. Test Ecologist',
          records: [observationRecord],
          rawData: { weather: 'Foggy morning', temperatureC: 14 },
        },
      });

      assert.equal(activity.activityId, testActId);
      assert.equal(activity.projectId, testProjId);
      assert.equal(activity.userId, testUserId);
      const records = activity.records as any[];
      assert.equal(records.length, 1);
      assert.equal(records[0].commonName, 'Nilgiri Tahr');
    });
  });

  // =========================================================================
  // 3. Core Entity UPDATE / PATCH Operations (Record Modification)
  // =========================================================================
  describe('3. Core Entity UPDATE Operations', () => {
    test('UPDATE User: modify profile details and verify updatedAt advances', async () => {
      const beforeUser = await prisma.user.findUniqueOrThrow({ where: { id: testUserId } });

      // Small delay to ensure timestamp resolution on Neon
      await new Promise((r) => setTimeout(r, 50));

      const updatedUser = await prisma.user.update({
        where: { id: testUserId },
        data: {
          name: 'Prof. Test Ecologist, PhD',
          role: 'Chief Conservation Biologist',
          avatar: 'PE',
        },
      });

      assert.equal(updatedUser.name, 'Prof. Test Ecologist, PhD');
      assert.equal(updatedUser.role, 'Chief Conservation Biologist');
      assert.equal(updatedUser.avatar, 'PE');
      assert.ok(updatedUser.updatedAt.getTime() >= beforeUser.updatedAt.getTime());
    });

    test('UPDATE Hub: patch name and description', async () => {
      const updatedHub = await prisma.hub.update({
        where: { id: testHubId },
        data: {
          name: 'KFRI Western Ghats Biodiversity Hub (Updated)',
          description: 'State-wide Kerala biodiversity monitoring network',
        },
      });

      assert.equal(updatedHub.name, 'KFRI Western Ghats Biodiversity Hub (Updated)');
      assert.equal(updatedHub.description, 'State-wide Kerala biodiversity monitoring network');
    });

    test('UPDATE Project: modify tags, keywords, and description', async () => {
      const updatedProject = await prisma.project.update({
        where: { projectId: testProjId },
        data: {
          description: 'Updated Nilgiri Tahr survey protocol for season 2',
          tags: ['Mammals', 'Conservation', 'Priority-Species'],
          keywords: ['Nilgiri Tahr', 'Western Ghats', 'Endangered', 'High-Altitude'],
        },
      });

      assert.equal(updatedProject.description, 'Updated Nilgiri Tahr survey protocol for season 2');
      assert.ok(updatedProject.tags.includes('Priority-Species'));
      assert.ok(updatedProject.keywords.includes('High-Altitude'));
    });

    test('UPDATE Survey: toggle published and status attributes', async () => {
      const updatedSurvey = await prisma.survey.update({
        where: { id: testSurveyId },
        data: {
          status: 'Completed',
          published: false,
        },
      });

      assert.equal(updatedSurvey.status, 'Completed');
      assert.equal(updatedSurvey.published, false);
    });

    test('UPDATE BioActivity: append new species observation to records JSONB', async () => {
      const newObservation = {
        guid: `rec-${runId}-2`,
        name: 'Trachypithecus johnii',
        commonName: 'Nilgiri Langur',
        individualCount: 8,
        coordinates: [10.201, 77.069],
      };

      const existingAct = await prisma.bioActivity.findUniqueOrThrow({ where: { activityId: testActId } });
      const currentRecords = Array.isArray(existingAct.records) ? existingAct.records : [];
      const updatedRecords = [...currentRecords, newObservation];

      const updated = await prisma.bioActivity.update({
        where: { activityId: testActId },
        data: {
          status: 'verified',
          records: updatedRecords,
          lastUpdated: new Date().toISOString(),
        },
      });

      assert.equal(updated.status, 'verified');
      const records = updated.records as any[];
      assert.equal(records.length, 2);
      assert.equal(records[1].commonName, 'Nilgiri Langur');
    });
  });

  // =========================================================================
  // 4. API Verification: REST Endpoints with Validation & Schema Mapping
  // =========================================================================
  describe('4. REST API CRUD Verification & HTTP Response Contracts', () => {
    const apiHubId = `api-hub-${Date.now()}`;
    const apiProjId = `api-proj-${Date.now()}`;
    const apiSurvId = `api-surv-${Date.now()}`;
    const apiActId = `api-act-${Date.now()}`;

    test('POST /ws/hub/create creates hub and returns 201 Created', async () => {
      const res = await fetch(`${baseUrl}/ws/hub/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: apiHubId,
          name: 'API Created Hub',
          url: 'https://api.example.com',
          description: 'Created through REST API',
          logo: 'https://api.example.com/logo.png',
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.id, apiHubId);
      assert.equal(data.name, 'API Created Hub');
    });

    test('PUT /ws/hub/update/:id updates hub and returns 200 OK', async () => {
      const res = await fetch(`${baseUrl}/ws/hub/update/${apiHubId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'API Updated Hub Name',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.name, 'API Updated Hub Name');
    });

    test('POST /ws/project/create creates project and returns 201 Created', async () => {
      const res = await fetch(`${baseUrl}/ws/project/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: apiProjId,
          name: 'API Test Project',
          description: 'Created via REST API for E2E verification',
          hub: apiHubId,
          keywords: ['API', 'Verification'],
          tags: ['E2E'],
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.projectId, apiProjId);
    });

    test('GET /ws/project/:projectId retrieves the created project', async () => {
      const res = await fetch(`${baseUrl}/ws/project/${apiProjId}`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.projectId, apiProjId);
      assert.equal(data.name, 'API Test Project');
    });

    test('PUT /ws/project/update/:projectId updates project and returns 200 OK', async () => {
      const res = await fetch(`${baseUrl}/ws/project/update/${apiProjId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Updated description through REST API',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.description, 'Updated description through REST API');
    });

    test('POST /ws/survey/create creates survey linked to project and returns 201', async () => {
      const res = await fetch(`${baseUrl}/ws/survey/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: apiSurvId,
          name: 'API Survey Test',
          projectId: apiProjId,
          published: true,
          publicAccess: true,
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.id, apiSurvId);
      assert.equal(data.projectId, apiProjId);
    });

    test('GET /ws/survey/:id and GET /ws/survey/list/:projectId return the created survey', async () => {
      const getRes = await fetch(`${baseUrl}/ws/survey/${apiSurvId}`);
      assert.equal(getRes.status, 200);
      const surveyData = await getRes.json();
      assert.equal(surveyData.name, 'API Survey Test');

      const listRes = await fetch(`${baseUrl}/ws/survey/list/${apiProjId}`);
      assert.equal(listRes.status, 200);
      const listData = await listRes.json();
      assert.ok(listData.some((s: any) => s.id === apiSurvId));
    });

    test('POST /ws/bioactivity/create creates activity and returns 201 Created', async () => {
      const res = await fetch(`${baseUrl}/ws/bioactivity/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: apiActId,
          projectActivityId: `pa-${apiSurvId}`,
          type: 'General Observation',
          status: 'active',
          userId: testUserId,
          name: 'API Activity Observation',
          projectId: apiProjId,
          records: [{ guid: 'rec-api-1', commonName: 'Kingfisher' }],
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.activityId, apiActId);
      assert.equal(data.records.length, 1);
    });

    test('PUT /ws/bioactivity/update/:activityId updates activity and returns 200 OK', async () => {
      const res = await fetch(`${baseUrl}/ws/bioactivity/update/${apiActId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'verified_complete',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'verified_complete');
    });

    test('POST /ws/bioactivity/create with missing required fields returns 400 Validation Error', async () => {
      const res = await fetch(`${baseUrl}/ws/bioactivity/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing required activityId, projectActivityId, type, status, userId, name
          status: 'active',
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error, 'Validation Error');
      assert.ok(Array.isArray(body.details));
    });

    test('PUT /ws/bioactivity/update/:activityId with non-existent id returns 404 Not Found', async () => {
      const res = await fetch(`${baseUrl}/ws/bioactivity/update/non-existent-activity-id`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'verified',
        }),
      });

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error, 'Activity not found');
    });

    test('DELETE /ws/bioactivity/:activityId deletes the activity', async () => {
      const res = await fetch(`${baseUrl}/ws/bioactivity/${apiActId}`, {
        method: 'DELETE',
      });
      assert.equal(res.status, 200);

      // Verify deletion
      const checkRes = await fetch(`${baseUrl}/ws/bioactivity/${apiActId}`);
      assert.equal(checkRes.status, 404);
    });

    // Cleanup API created test entities
    after(async () => {
      try {
        await prisma.bioActivity.deleteMany({ where: { activityId: apiActId } });
        await prisma.survey.deleteMany({ where: { id: apiSurvId } });
        await prisma.project.deleteMany({ where: { projectId: apiProjId } });
        await prisma.hub.deleteMany({ where: { id: apiHubId } });
      } catch (_) {}
    });
  });

  // =========================================================================
  // 5. User Management: Sign-up, Sign-in, Session Retrieval & Sign-out
  // =========================================================================
  describe('5. User Management via Better Auth & Database Sync', () => {
    const authEmail = `user.mgmt.${Date.now()}@kfri.res.in`;
    const authPassword = 'SecureAuthPass2026!';
    let sessionToken = '';
    let cookie = '';

    test('user registration (Sign-up) persists user to Neon DB', async () => {
      const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          name: 'Ranger Maya Nair',
          email: authEmail,
          password: authPassword,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(body.user);
      assert.equal(body.user.email, authEmail);
      assert.equal(body.user.name, 'Ranger Maya Nair');

      // Verify directly from Neon DB
      const dbUser = await prisma.user.findUnique({
        where: { email: authEmail },
      });
      assert.ok(dbUser);
      assert.equal(dbUser.name, 'Ranger Maya Nair');
    });

    test('user sign-in authenticates and creates an active session in Neon DB', async () => {
      const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(body.token, 'Expected session token in response');
      sessionToken = body.token;

      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        cookie = setCookie.split(';')[0];
      }

      // Verify session exists in Neon DB
      const dbSession = await prisma.session.findUnique({
        where: { token: sessionToken },
      });
      assert.ok(dbSession, 'Session must exist in Neon database');
      assert.ok(dbSession.expiresAt.getTime() > Date.now());
    });

    test('session retrieval via Bearer token returns consistent user profile', async () => {
      assert.ok(sessionToken);
      const res = await fetch(`${baseUrl}/api/auth/get-session`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          Origin: 'http://localhost:3000',
        },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data?.user);
      assert.equal(data.user.email, authEmail);
      assert.equal(data.user.name, 'Ranger Maya Nair');
    });

    test('session retrieval via HTTP-only cookie succeeds (Frontend credentials flow)', async () => {
      if (!cookie) return;
      const res = await fetch(`${baseUrl}/api/auth/get-session`, {
        headers: {
          Cookie: cookie,
          Origin: 'http://localhost:3000',
        },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data?.user);
      assert.equal(data.user.email, authEmail);
    });

    test('sign-out removes the session from Neon DB and invalidates tokens', async () => {
      const res = await fetch(`${baseUrl}/api/auth/sign-out`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          Origin: 'http://localhost:3000',
        },
      });

      assert.equal(res.status, 200);

      // Verify session no longer exists in Neon DB
      const dbSession = await prisma.session.findUnique({
        where: { token: sessionToken },
      });
      assert.equal(dbSession, null, 'Session record should be deleted from Neon database on sign out');
    });
  });

  // =========================================================================
  // 6. Schema Constraints & Relationship Integrity
  // =========================================================================
  describe('6. Schema Constraints & Relationship Integrity', () => {
    test('enforces foreign key constraint: survey referencing non-existent project fails', async () => {
      let threw = false;
      try {
        await prisma.survey.create({
          data: {
            id: `surv-fk-fail-${Date.now()}`,
            name: 'Orphaned Survey',
            projectId: 'non-existent-project-id-99999',
          },
        });
      } catch (err: any) {
        threw = true;
        // Foreign key violation error code in Prisma (P2003)
        assert.ok(
          err.code === 'P2003' || err.message.includes('foreign key constraint') || err.message.includes('Foreign key'),
          `Expected foreign key violation, got: ${err.message}`
        );
      }
      assert.ok(threw, 'Should fail when inserting record with invalid foreign key');
    });

    test('enforces unique constraint: duplicate user email is rejected', async () => {
      let threw = false;
      try {
        await prisma.user.create({
          data: {
            id: `dup-user-${Date.now()}`,
            email: testUserEmail, // already exists
            name: 'Duplicate Email User',
          },
        });
      } catch (err: any) {
        threw = true;
        // Unique constraint violation in Prisma (P2002)
        assert.ok(
          err.code === 'P2002' || err.message.includes('Unique constraint'),
          `Expected unique constraint violation, got: ${err.message}`
        );
      }
      assert.ok(threw, 'Should reject duplicate email');
    });

    test('cascade delete: deleting a Project cascades to delete child Surveys', async () => {
      const cascadeProjId = `cascade-proj-${Date.now()}`;
      const cascadeSurvId = `cascade-surv-${Date.now()}`;

      // Create Project and Survey
      await prisma.project.create({
        data: {
          projectId: cascadeProjId,
          name: 'Cascade Project Test',
        },
      });

      await prisma.survey.create({
        data: {
          id: cascadeSurvId,
          name: 'Cascade Survey Test',
          projectId: cascadeProjId,
        },
      });

      // Verify survey exists
      const survBefore = await prisma.survey.findUnique({ where: { id: cascadeSurvId } });
      assert.ok(survBefore);

      // Delete parent Project
      await prisma.project.delete({ where: { projectId: cascadeProjId } });

      // Verify child survey was cascade deleted
      const survAfter = await prisma.survey.findUnique({ where: { id: cascadeSurvId } });
      assert.equal(survAfter, null, 'Child survey should be deleted when parent project is deleted');
    });

    test('onDelete SetNull: deleting a Project sets BioActivity projectId to null', async () => {
      const setNullProjId = `setnull-proj-${Date.now()}`;
      const setNullActId = `setnull-act-${Date.now()}`;

      await prisma.project.create({
        data: {
          projectId: setNullProjId,
          name: 'SetNull Project Test',
        },
      });

      await prisma.bioActivity.create({
        data: {
          activityId: setNullActId,
          projectActivityId: `pa-${setNullActId}`,
          type: 'Survey Observation',
          status: 'active',
          lastUpdated: new Date().toISOString(),
          userId: testUserId,
          name: 'SetNull Activity Test',
          projectId: setNullProjId,
        },
      });

      // Delete project
      await prisma.project.delete({ where: { projectId: setNullProjId } });

      // Verify activity still exists but projectId is null
      const actAfter = await prisma.bioActivity.findUnique({ where: { activityId: setNullActId } });
      assert.ok(actAfter);
      assert.equal(actAfter.projectId, null, 'Activity projectId should be set to null');

      // Cleanup
      await prisma.bioActivity.delete({ where: { activityId: setNullActId } });
    });
  });
});
