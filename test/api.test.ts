import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../src/app';
import { store } from '../src/services/store';

describe('LookAround Backend API Contract Test Suite', () => {
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
  });

  beforeEach(() => {
    // Reset data store to initial state between tests
    store.reset();
  });

  // ==========================================
  // 1. Hubs Endpoint: GET /ws/hub/pwaList
  // ==========================================
  describe('GET /ws/hub/pwaList', () => {
    test('returns 200 and list of hubs adhering to contract schema', async () => {
      const res = await fetch(`${baseUrl}/ws/hub/pwaList`);
      assert.equal(res.status, 200);

      const hubs = await res.json();
      assert.ok(Array.isArray(hubs), 'Expected response to be an array');
      assert.ok(hubs.length > 0, 'Expected at least one hub');

      for (const hub of hubs) {
        assert.ok(typeof hub.id === 'string', 'hub.id must be a string');
        assert.ok(typeof hub.url === 'string', 'hub.url must be a string');
        assert.ok(typeof hub.name === 'string', 'hub.name must be a string');
        assert.ok(typeof hub.description === 'string', 'hub.description must be a string');
        assert.ok(typeof hub.logo === 'string', 'hub.logo must be a string');
      }
    });
  });

  // ==========================================
  // 2. Project Search: GET /ws/project/search
  // ==========================================
  describe('GET /ws/project/search', () => {
    test('returns 400 Validation Error when required fq is missing', async () => {
      const res = await fetch(`${baseUrl}/ws/project/search`);
      assert.equal(res.status, 400);

      const body = await res.json();
      assert.equal(body.error, 'Validation Error');
      assert.ok(Array.isArray(body.details), 'details should be an array of errors');
    });

    test('returns 200 and projects matching contract when fq is provided', async () => {
      const res = await fetch(`${baseUrl}/ws/project/search?fq=isExternal:F`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.ok(Array.isArray(body.facets), 'facets must be an array');
      assert.ok(typeof body.total === 'number', 'total must be a number');
      assert.ok(Array.isArray(body.projects), 'projects must be an array');

      if (body.projects.length > 0) {
        const project = body.projects[0];
        assert.ok(typeof project.projectId === 'string');
        assert.ok(typeof project.name === 'string');
        assert.ok(typeof project.description === 'string');
        assert.ok(Array.isArray(project.projectActivities), 'projectActivities must be an array');
      }
    });

    test('handles multiple fq query parameters', async () => {
      const res = await fetch(`${baseUrl}/ws/project/search?fq=isExternal:F&fq=allParticipants:ALL`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(body.total >= 0);
    });

    test('filters projects by hub', async () => {
      const res = await fetch(`${baseUrl}/ws/project/search?fq=isExternal:F&hub=acsa`);
      assert.equal(res.status, 200);

      const body = await res.json();
      for (const p of body.projects) {
        assert.equal(p.hub, 'acsa');
      }
    });

    test('filters projects by search term q', async () => {
      const res = await fetch(`${baseUrl}/ws/project/search?fq=isExternal:F&q=*Southern*`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.ok(body.projects.length > 0);
      for (const p of body.projects) {
        const text = `${p.name} ${p.description} ${p.aim || ''}`.toLowerCase();
        assert.ok(text.includes('southern'));
      }
    });

    test('respects pagination max and offset', async () => {
      const res = await fetch(`${baseUrl}/ws/project/search?fq=isExternal:F&max=2&offset=1`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.ok(body.projects.length <= 2);
    });

    test('sorts projects by name when sort=nameSort', async () => {
      const res = await fetch(`${baseUrl}/ws/project/search?fq=isExternal:F&sort=nameSort`);
      assert.equal(res.status, 200);

      const body = await res.json();
      const names = body.projects.map((p: any) => p.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      assert.deepEqual(names, sortedNames);
    });
  });

  // ==========================================
  // 3. Project Details: GET /ws/project/:projectId
  // ==========================================
  describe('GET /ws/project/:projectId', () => {
    test('returns 200 and project details including projectActivities', async () => {
      const res = await fetch(`${baseUrl}/ws/project/proj-gsb-01`);
      assert.equal(res.status, 200);

      const project = await res.json();
      assert.equal(project.projectId, 'proj-gsb-01');
      assert.ok(project.name);
      assert.ok(Array.isArray(project.projectActivities));
      assert.ok(project.projectActivities.length > 0);
    });

    test('returns 404 for non-existent project', async () => {
      const res = await fetch(`${baseUrl}/ws/project/non-existent-proj-id`);
      assert.equal(res.status, 404);

      const body = await res.json();
      assert.equal(body.error, 'Project not found');
    });
  });

  // ==========================================
  // 4. Survey List: GET /ws/survey/list/:projectId
  // ==========================================
  describe('GET /ws/survey/list/:projectId', () => {
    test('returns 200 and list of surveys conforming to schema', async () => {
      const res = await fetch(`${baseUrl}/ws/survey/list/proj-gsb-01`);
      assert.equal(res.status, 200);

      const surveys = await res.json();
      assert.ok(Array.isArray(surveys));
      assert.ok(surveys.length > 0);

      for (const survey of surveys) {
        assert.ok(typeof survey.id === 'string');
        assert.ok(typeof survey.name === 'string');
        assert.ok(typeof survey.published === 'boolean');
        assert.ok(typeof survey.publicAccess === 'boolean');
      }
    });

    test('returns empty array 200 for project with no surveys', async () => {
      const res = await fetch(`${baseUrl}/ws/survey/list/empty-surveys-proj`);
      assert.equal(res.status, 200);

      const surveys = await res.json();
      assert.ok(Array.isArray(surveys));
      assert.equal(surveys.length, 0);
    });
  });

  // ==========================================
  // 5. BioActivity Search: GET /ws/bioactivity/search
  // ==========================================
  describe('GET /ws/bioactivity/search', () => {
    test('returns 400 Validation Error when view parameter is missing', async () => {
      const res = await fetch(`${baseUrl}/ws/bioactivity/search`);
      assert.equal(res.status, 400);

      const body = await res.json();
      assert.equal(body.error, 'Validation Error');
    });

    test('returns 400 Validation Error when view parameter is invalid', async () => {
      const res = await fetch(`${baseUrl}/ws/bioactivity/search?view=invalid_view`);
      assert.equal(res.status, 400);

      const body = await res.json();
      assert.equal(body.error, 'Validation Error');
    });

    test('returns 200 and all records with view=allrecords', async () => {
      const res = await fetch(`${baseUrl}/ws/bioactivity/search?view=allrecords`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.ok(Array.isArray(body.activities));
      assert.ok(body.activities.length > 0);

      const act = body.activities[0];
      assert.ok(typeof act.activityId === 'string');
      assert.ok(typeof act.projectActivityId === 'string');
      assert.ok(typeof act.type === 'string');
      assert.ok(typeof act.status === 'string');
      assert.ok(typeof act.lastUpdated === 'string');
      assert.ok(typeof act.userId === 'string');
      assert.ok(typeof act.name === 'string');
      assert.ok(Array.isArray(act.records));

      if (act.records.length > 0) {
        const record = act.records[0];
        assert.ok(record.multimedia);
        assert.ok(typeof record.multimedia.imageId === 'string');
      }
    });

    test('filters by myrecords when view=myrecords', async () => {
      const res = await fetch(
        `${baseUrl}/ws/bioactivity/search?view=myrecords&userId=mock-user-ecologist-001`
      );
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.ok(body.activities.length > 0);
      for (const act of body.activities) {
        assert.equal(act.userId, 'mock-user-ecologist-001');
      }
    });

    test('filters by project with view=project', async () => {
      const res = await fetch(
        `${baseUrl}/ws/bioactivity/search?view=project&projectId=proj-gsb-01`
      );
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.ok(body.activities.length > 0);
      for (const act of body.activities) {
        assert.equal(act.projectId, 'proj-gsb-01');
      }
    });

    test('filters activities by searchTerm', async () => {
      const res = await fetch(
        `${baseUrl}/ws/bioactivity/search?view=allrecords&searchTerm=Rosella`
      );
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.ok(body.activities.length > 0);
    });
  });

  // ==========================================
  // 6. Delete BioActivity: DELETE /ws/bioactivity/delete/:activityId
  // ==========================================
  describe('DELETE /ws/bioactivity/delete/:activityId', () => {
    test('returns 200 Void response when activity is deleted', async () => {
      // First ensure act-001 exists
      const checkRes = await fetch(`${baseUrl}/ws/bioactivity/search?view=allrecords`);
      const checkBody = await checkRes.json();
      assert.ok(checkBody.activities.some((a: any) => a.activityId === 'act-001'));

      // Delete act-001
      const res = await fetch(`${baseUrl}/ws/bioactivity/delete/act-001`, {
        method: 'DELETE',
      });

      assert.equal(res.status, 200);
      const text = await res.text();
      // Contract: Schema Void (No JSON payload required)
      assert.equal(text, '', 'Expected empty void response body');

      // Verify it is no longer returned
      const afterRes = await fetch(`${baseUrl}/ws/bioactivity/search?view=allrecords`);
      const afterBody = await afterRes.json();
      assert.ok(!afterBody.activities.some((a: any) => a.activityId === 'act-001'));
    });

    test('returns 404 Not Found when trying to delete non-existent activity', async () => {
      const res = await fetch(`${baseUrl}/ws/bioactivity/delete/non-existent-id`, {
        method: 'DELETE',
      });
      assert.equal(res.status, 404);

      const body = await res.json();
      assert.equal(body.error, 'Activity not found');
    });
  });

  // ==========================================
  // 7. Authorization Header Handling
  // ==========================================
  describe('Authorization Header Handling', () => {
    test('rejects malformed Authorization header with 401', async () => {
      const res = await fetch(`${baseUrl}/ws/bioactivity/search?view=allrecords`, {
        headers: {
          Authorization: 'Basic invalid_token_format',
        },
      });
      assert.equal(res.status, 401);

      const body = await res.json();
      assert.equal(body.error, 'Unauthorized');
    });

    test('accepts valid Bearer token format', async () => {
      const res = await fetch(`${baseUrl}/ws/bioactivity/search?view=myrecords`, {
        headers: {
          Authorization: 'Bearer mock-user-ecologist-001',
        },
      });
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.ok(Array.isArray(body.activities));
    });
  });
});
