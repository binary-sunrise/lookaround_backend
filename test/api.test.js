"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const app_1 = require("../src/app");
const store_1 = require("../src/services/store");
(0, node_test_1.describe)('LookAround Backend API Contract Test Suite', () => {
    let server;
    let baseUrl;
    (0, node_test_1.before)(async () => {
        await new Promise((resolve) => {
            server = app_1.app.listen(0, () => {
                const address = server.address();
                if (address && typeof address === 'object') {
                    baseUrl = `http://127.0.0.1:${address.port}`;
                }
                resolve();
            });
        });
    });
    (0, node_test_1.after)(async () => {
        await new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
    });
    (0, node_test_1.beforeEach)(() => {
        // Reset data store to initial state between tests
        store_1.store.reset();
    });
    // ==========================================
    // 1. Hubs Endpoint: GET /ws/hub/pwaList
    // ==========================================
    (0, node_test_1.describe)('GET /ws/hub/pwaList', () => {
        (0, node_test_1.test)('returns 200 and list of hubs adhering to contract schema', async () => {
            const res = await fetch(`${baseUrl}/ws/hub/pwaList`);
            strict_1.default.equal(res.status, 200);
            const hubs = await res.json();
            strict_1.default.ok(Array.isArray(hubs), 'Expected response to be an array');
            strict_1.default.ok(hubs.length > 0, 'Expected at least one hub');
            for (const hub of hubs) {
                strict_1.default.ok(typeof hub.id === 'string', 'hub.id must be a string');
                strict_1.default.ok(typeof hub.url === 'string', 'hub.url must be a string');
                strict_1.default.ok(typeof hub.name === 'string', 'hub.name must be a string');
                strict_1.default.ok(typeof hub.description === 'string', 'hub.description must be a string');
                strict_1.default.ok(typeof hub.logo === 'string', 'hub.logo must be a string');
            }
        });
    });
    // ==========================================
    // 2. Project Search: GET /ws/project/search
    // ==========================================
    (0, node_test_1.describe)('GET /ws/project/search', () => {
        (0, node_test_1.test)('returns 400 Validation Error when required fq is missing', async () => {
            const res = await fetch(`${baseUrl}/ws/project/search`);
            strict_1.default.equal(res.status, 400);
            const body = await res.json();
            strict_1.default.equal(body.error, 'Validation Error');
            strict_1.default.ok(Array.isArray(body.details), 'details should be an array of errors');
        });
        (0, node_test_1.test)('returns 200 and projects matching contract when fq is provided', async () => {
            const res = await fetch(`${baseUrl}/ws/project/search?fq=isExternal:F`);
            strict_1.default.equal(res.status, 200);
            const body = await res.json();
            strict_1.default.ok(Array.isArray(body.facets), 'facets must be an array');
            strict_1.default.ok(typeof body.total === 'number', 'total must be a number');
            strict_1.default.ok(Array.isArray(body.projects), 'projects must be an array');
            if (body.projects.length > 0) {
                const project = body.projects[0];
                strict_1.default.ok(typeof project.projectId === 'string');
                strict_1.default.ok(typeof project.name === 'string');
                strict_1.default.ok(typeof project.description === 'string');
                strict_1.default.ok(Array.isArray(project.projectActivities), 'projectActivities must be an array');
            }
        });
        (0, node_test_1.test)('handles multiple fq query parameters', async () => {
            const res = await fetch(`${baseUrl}/ws/project/search?fq=isExternal:F&fq=allParticipants:ALL`);
            strict_1.default.equal(res.status, 200);
            const body = await res.json();
            strict_1.default.ok(body.total >= 0);
        });
        (0, node_test_1.test)('filters projects by hub', async () => {
            const res = await fetch(`${baseUrl}/ws/project/search?fq=isExternal:F&hub=acsa`);
            strict_1.default.equal(res.status, 200);
            const body = await res.json();
            for (const p of body.projects) {
                strict_1.default.equal(p.hub, 'acsa');
            }
        });
        (0, node_test_1.test)('filters projects by search term q', async () => {
            const res = await fetch(`${baseUrl}/ws/project/search?fq=isExternal:F&q=*Southern*`);
            strict_1.default.equal(res.status, 200);
            const body = await res.json();
            strict_1.default.ok(body.projects.length > 0);
            for (const p of body.projects) {
                const text = `${p.name} ${p.description} ${p.aim || ''}`.toLowerCase();
                strict_1.default.ok(text.includes('southern'));
            }
        });
        (0, node_test_1.test)('respects pagination max and offset', async () => {
            const res = await fetch(`${baseUrl}/ws/project/search?fq=isExternal:F&max=2&offset=1`);
            strict_1.default.equal(res.status, 200);
            const body = await res.json();
            strict_1.default.ok(body.projects.length <= 2);
        });
        (0, node_test_1.test)('sorts projects by name when sort=nameSort', async () => {
            const res = await fetch(`${baseUrl}/ws/project/search?fq=isExternal:F&sort=nameSort`);
            strict_1.default.equal(res.status, 200);
            const body = await res.json();
            const names = body.projects.map((p) => p.name);
            const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
            strict_1.default.deepEqual(names, sortedNames);
        });
    });
    // ==========================================
    // 3. Project Details: GET /ws/project/:projectId
    // ==========================================
    (0, node_test_1.describe)('GET /ws/project/:projectId', () => {
        (0, node_test_1.test)('returns 200 and project details including projectActivities', async () => {
            const res = await fetch(`${baseUrl}/ws/project/proj-gsb-01`);
            strict_1.default.equal(res.status, 200);
            const project = await res.json();
            strict_1.default.equal(project.projectId, 'proj-gsb-01');
            strict_1.default.ok(project.name);
            strict_1.default.ok(Array.isArray(project.projectActivities));
            strict_1.default.ok(project.projectActivities.length > 0);
        });
        (0, node_test_1.test)('returns 404 for non-existent project', async () => {
            const res = await fetch(`${baseUrl}/ws/project/non-existent-proj-id`);
            strict_1.default.equal(res.status, 404);
            const body = await res.json();
            strict_1.default.equal(body.error, 'Project not found');
        });
    });
    // ==========================================
    // 4. Survey List: GET /ws/survey/list/:projectId
    // ==========================================
    (0, node_test_1.describe)('GET /ws/survey/list/:projectId', () => {
        (0, node_test_1.test)('returns 200 and list of surveys conforming to schema', async () => {
            const res = await fetch(`${baseUrl}/ws/survey/list/proj-gsb-01`);
            strict_1.default.equal(res.status, 200);
            const surveys = await res.json();
            strict_1.default.ok(Array.isArray(surveys));
            strict_1.default.ok(surveys.length > 0);
            for (const survey of surveys) {
                strict_1.default.ok(typeof survey.id === 'string');
                strict_1.default.ok(typeof survey.name === 'string');
                strict_1.default.ok(typeof survey.published === 'boolean');
                strict_1.default.ok(typeof survey.publicAccess === 'boolean');
            }
        });
        (0, node_test_1.test)('returns empty array 200 for project with no surveys', async () => {
            const res = await fetch(`${baseUrl}/ws/survey/list/empty-surveys-proj`);
            strict_1.default.equal(res.status, 200);
            const surveys = await res.json();
            strict_1.default.ok(Array.isArray(surveys));
            strict_1.default.equal(surveys.length, 0);
        });
    });
    // ==========================================
    // 5. BioActivity Search: GET /ws/bioactivity/search
    // ==========================================
    (0, node_test_1.describe)('GET /ws/bioactivity/search', () => {
        (0, node_test_1.test)('returns 400 Validation Error when view parameter is missing', async () => {
            const res = await fetch(`${baseUrl}/ws/bioactivity/search`);
            strict_1.default.equal(res.status, 400);
            const body = await res.json();
            strict_1.default.equal(body.error, 'Validation Error');
        });
        (0, node_test_1.test)('returns 400 Validation Error when view parameter is invalid', async () => {
            const res = await fetch(`${baseUrl}/ws/bioactivity/search?view=invalid_view`);
            strict_1.default.equal(res.status, 400);
            const body = await res.json();
            strict_1.default.equal(body.error, 'Validation Error');
        });
        (0, node_test_1.test)('returns 200 and all records with view=allrecords', async () => {
            const res = await fetch(`${baseUrl}/ws/bioactivity/search?view=allrecords`);
            strict_1.default.equal(res.status, 200);
            const body = await res.json();
            strict_1.default.ok(Array.isArray(body.activities));
            strict_1.default.ok(body.activities.length > 0);
            const act = body.activities[0];
            strict_1.default.ok(typeof act.activityId === 'string');
            strict_1.default.ok(typeof act.projectActivityId === 'string');
            strict_1.default.ok(typeof act.type === 'string');
            strict_1.default.ok(typeof act.status === 'string');
            strict_1.default.ok(typeof act.lastUpdated === 'string');
            strict_1.default.ok(typeof act.userId === 'string');
            strict_1.default.ok(typeof act.name === 'string');
            strict_1.default.ok(Array.isArray(act.records));
            if (act.records.length > 0) {
                const record = act.records[0];
                strict_1.default.ok(record.multimedia);
                strict_1.default.ok(typeof record.multimedia.imageId === 'string');
            }
        });
        (0, node_test_1.test)('filters by myrecords when view=myrecords', async () => {
            const res = await fetch(`${baseUrl}/ws/bioactivity/search?view=myrecords&userId=mock-user-ecologist-001`);
            strict_1.default.equal(res.status, 200);
            const body = await res.json();
            strict_1.default.ok(body.activities.length > 0);
            for (const act of body.activities) {
                strict_1.default.equal(act.userId, 'mock-user-ecologist-001');
            }
        });
        (0, node_test_1.test)('filters by project with view=project', async () => {
            const res = await fetch(`${baseUrl}/ws/bioactivity/search?view=project&projectId=proj-gsb-01`);
            strict_1.default.equal(res.status, 200);
            const body = await res.json();
            strict_1.default.ok(body.activities.length > 0);
            for (const act of body.activities) {
                strict_1.default.equal(act.projectId, 'proj-gsb-01');
            }
        });
        (0, node_test_1.test)('filters activities by searchTerm', async () => {
            const res = await fetch(`${baseUrl}/ws/bioactivity/search?view=allrecords&searchTerm=Rosella`);
            strict_1.default.equal(res.status, 200);
            const body = await res.json();
            strict_1.default.ok(body.activities.length > 0);
        });
    });
    // ==========================================
    // 6. Delete BioActivity: DELETE /ws/bioactivity/delete/:activityId
    // ==========================================
    (0, node_test_1.describe)('DELETE /ws/bioactivity/delete/:activityId', () => {
        (0, node_test_1.test)('returns 200 Void response when activity is deleted', async () => {
            // First ensure act-001 exists
            const checkRes = await fetch(`${baseUrl}/ws/bioactivity/search?view=allrecords`);
            const checkBody = await checkRes.json();
            strict_1.default.ok(checkBody.activities.some((a) => a.activityId === 'act-001'));
            // Delete act-001
            const res = await fetch(`${baseUrl}/ws/bioactivity/delete/act-001`, {
                method: 'DELETE',
            });
            strict_1.default.equal(res.status, 200);
            const text = await res.text();
            // Contract: Schema Void (No JSON payload required)
            strict_1.default.equal(text, '', 'Expected empty void response body');
            // Verify it is no longer returned
            const afterRes = await fetch(`${baseUrl}/ws/bioactivity/search?view=allrecords`);
            const afterBody = await afterRes.json();
            strict_1.default.ok(!afterBody.activities.some((a) => a.activityId === 'act-001'));
        });
        (0, node_test_1.test)('returns 404 Not Found when trying to delete non-existent activity', async () => {
            const res = await fetch(`${baseUrl}/ws/bioactivity/delete/non-existent-id`, {
                method: 'DELETE',
            });
            strict_1.default.equal(res.status, 404);
            const body = await res.json();
            strict_1.default.equal(body.error, 'Activity not found');
        });
    });
    // ==========================================
    // 7. Authorization Header Handling
    // ==========================================
    (0, node_test_1.describe)('Authorization Header Handling', () => {
        (0, node_test_1.test)('rejects malformed Authorization header with 401', async () => {
            const res = await fetch(`${baseUrl}/ws/bioactivity/search?view=allrecords`, {
                headers: {
                    Authorization: 'Basic invalid_token_format',
                },
            });
            strict_1.default.equal(res.status, 401);
            const body = await res.json();
            strict_1.default.equal(body.error, 'Unauthorized');
        });
        (0, node_test_1.test)('accepts valid Bearer token format', async () => {
            const res = await fetch(`${baseUrl}/ws/bioactivity/search?view=myrecords`, {
                headers: {
                    Authorization: 'Bearer mock-user-ecologist-001',
                },
            });
            strict_1.default.equal(res.status, 200);
            const body = await res.json();
            strict_1.default.ok(Array.isArray(body.activities));
        });
    });
});
