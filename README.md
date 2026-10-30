# B-Liffe Backend Service

Robust, contract-conforming backend service and data layer for the **B-Liffe Biodiversity Field Data Collection Application**.

Developed in TypeScript with Express 5, Prisma ORM, and PostgreSQL, strictly aligned with B-Liffe's frontend data contracts, Dexie IndexedDB schemas, Darwin Core (DwC) standards, and Thiruvananthapuram Corporation GIS boundary requirements.

---

## Technology Stack

- **Runtime & Language**: Node.js (v20+) with TypeScript (CommonJS / tsx / tsc)
- **Web Framework**: Express 5 (`express@^5.2.1`) with CORS middleware and centralized error handling
- **Data Validation**: Zod (`zod@^4.6.5`) schemas strictly adhering to B-Liffe data models
- **Database Engine**: PostgreSQL 16 (local containerized or Neon Serverless)
- **ORM & Migrations**: Prisma ORM 7 (`@prisma/client` and `prisma CLI`)
- **Authentication**: Better Auth with email/password, bearer token sessions, and OAuth

---

## Directory Structure Alignment

The backend directory structure mirrors and services the B-Liffe frontend domain architecture:

```
B-Liffe_Backend/
├── prisma/
│   ├── schema.prisma          # Database models (Projects, Wards, Surveys, Observations, Profiles)
│   ├── migrations/            # Version-controlled SQL migration scripts
│   └── seed.ts                # Database seeding script
├── src/
│   ├── app.ts                 # Express application setup, CORS, session extraction, and router mounts
│   ├── auth.ts                # Better Auth configuration with Bearer plugin
│   ├── index.ts               # Server entry point
│   ├── db/
│   │   └── client.ts          # Typed PrismaClient with Neon & PG adapter support
│   ├── middleware/
│   │   ├── auth.ts            # Bearer token extractor & session validation
│   │   └── errorHandler.ts    # Standardized error responses (Zod, Prisma, HTTP)
│   ├── schemas/
│   │   ├── index.ts           # Unified barrel export
│   │   ├── bliffe.ts          # B-Liffe entity schemas (Project, Ward, Survey, Observation, Profile, Sync)
│   │   └── legacy.ts          # Preserved BioCollect contract schemas
│   ├── routes/
│   │   ├── index.ts           # Central API router mounting all domain handlers
│   │   ├── auth.ts            # /api/auth (register, login, logout, me)
│   │   ├── profile.ts         # /api/profile and /api/v1/profile (GET & PUT)
│   │   ├── projects.ts        # /api/projects (CRUD, status filtering, ward sub-routes)
│   │   ├── wards.ts           # /api/wards & /api/wards/identify (GIS matching)
│   │   ├── surveys.ts         # /api/surveys (Sampling session CRUD)
│   │   ├── observations.ts    # /api/observations & /batch (Darwin Core aligned records)
│   │   ├── sync.ts            # /api/sync & /status (Offline Dexie batch synchronizer)
│   │   ├── export.ts          # /api/export/dwc (Darwin Core standard export)
│   │   └── legacy/            # Preserved backwards-compatible ALA BioCollect routes
│   │       ├── hub.ts
│   │       ├── project.ts
│   │       ├── survey.ts
│   │       └── bioactivity.ts
│   └── services/
│       ├── wardService.ts     # Thiruvananthapuram Corporation GIS boundary point matching
│       └── dwcExportService.ts# Darwin Core occurrence transformer with dynamicProperties
└── test/
    ├── bliffe-api.test.ts     # 21 integration tests verifying B-Liffe contract conformance
    └── api.test.ts            # 31 integration tests verifying backwards-compatible routes
```

---

## API Route Specification

### 1. Authentication & Profile (`/api/auth` & `/api/profile`)

| Method | Endpoint | Description | Request Body / Query | Response Status & Shape |
|--------|----------|-------------|----------------------|-------------------------|
| `POST` | `/api/auth/register` | Register researcher account & profile | `{ fullName, email, password }` | `201 Created` → `{ user: UserProfile, token }` |
| `POST` | `/api/auth/login` | Login with credentials | `{ email, password }` | `200 OK` → `{ user: UserProfile, token }` |
| `POST` | `/api/auth/logout` | Sign out and invalidate session | Header: `Authorization: Bearer <token>` | `200 OK` → `{ success: true }` |
| `GET` | `/api/auth/me` | Get current session profile | Header: `Authorization: Bearer <token>` | `200 OK` → `UserProfile` |
| `GET` | `/api/v1/profile` | Get researcher profile | None / Session | `200 OK` → `UserProfile` |
| `PUT` | `/api/v1/profile` | Update researcher profile | `ProfileUpdateInput` | `200 OK` → `UserProfile` |

### 2. Projects (`/api/projects`)

| Method | Endpoint | Description | Request Body / Query | Response Status & Shape |
|--------|----------|-------------|----------------------|-------------------------|
| `GET` | `/api/projects` | List projects with counts | Query: `status`, `search`, `organization`, `targetRegion`, `limit`, `offset` | `200 OK` → `Project[]` |
| `POST` | `/api/projects` | Create a new project | `CreateProjectInput` | `201 Created` → `Project` |
| `GET` | `/api/projects/:id` | Get full project details with wards & surveys | Param: `id` | `200 OK` → `Project & { wards, surveys }` |
| `PUT` | `/api/projects/:id` | Update project metadata | `UpdateProjectInput` | `200 OK` → `Project` |
| `DELETE` | `/api/projects/:id` | Delete project | Param: `id` | `200 OK` → `{ success: true }` |
| `GET` | `/api/projects/:projectId/wards` | List wards for a project | Param: `projectId` | `200 OK` → `Ward[]` |
| `POST` | `/api/projects/:projectId/wards` | Add a ward to a project | `CreateWardInput` | `201 Created` → `Ward` |

### 3. Wards & GIS Boundary Matching (`/api/wards`)

| Method | Endpoint | Description | Request Body / Query | Response Status & Shape |
|--------|----------|-------------|----------------------|-------------------------|
| `POST` / `GET` | `/api/wards/identify` | Match GPS coordinates against Thiruvananthapuram GIS boundaries | Body/Query: `{ latitude, longitude }` | `200 OK` → `WardIdentificationResult` |
| `GET` | `/api/wards` | List all wards | Query: `projectId`, `district`, `search` | `200 OK` → `Ward[]` |
| `POST` | `/api/wards` | Create administrative ward | `CreateWardInput` | `201 Created` → `Ward` |
| `GET` | `/api/wards/:id` | Get ward by ID | Param: `id` | `200 OK` → `Ward` |
| `PUT` | `/api/wards/:id` | Update ward details | `UpdateWardInput` | `200 OK` → `Ward` |
| `DELETE` | `/api/wards/:id` | Delete ward | Param: `id` | `200 OK` → `{ success: true }` |

### 4. Surveys / Field Visits (`/api/surveys`)

| Method | Endpoint | Description | Request Body / Query | Response Status & Shape |
|--------|----------|-------------|----------------------|-------------------------|
| `GET` | `/api/surveys` | List surveys | Query: `projectId`, `wardId`, `leadObserver`, `search` | `200 OK` → `Survey[]` |
| `POST` | `/api/surveys` | Record field survey visit | `CreateSurveyInput` | `201 Created` → `Survey` |
| `GET` | `/api/surveys/:id` | Get survey with observation count | Param: `id` | `200 OK` → `Survey` |
| `PUT` | `/api/surveys/:id` | Update survey notes / observers | `UpdateSurveyInput` | `200 OK` → `Survey` |
| `DELETE` | `/api/surveys/:id` | Delete survey | Param: `id` | `200 OK` → `{ success: true }` |

### 5. Observations (`/api/observations`)

| Method | Endpoint | Description | Request Body / Query | Response Status & Shape |
|--------|----------|-------------|----------------------|-------------------------|
| `GET` | `/api/observations` | Filter observations by status, tag, species | Query: `projectId`, `wardId`, `surveyId`, `status`, `tag`, `search`, `limit`, `offset` | `200 OK` → `Observation[]` |
| `POST` | `/api/observations` | Record new observation | `CreateObservationInput` | `201 Created` → `Observation` |
| `GET` | `/api/observations/:id` | Get observation by ID | Param: `id` | `200 OK` → `Observation` |
| `PUT` | `/api/observations/:id` | Update observation (notes, verification, species) | `UpdateObservationInput` | `200 OK` → `Observation` |
| `DELETE` | `/api/observations/:id` | Delete observation | Param: `id` | `200 OK` → `{ success: true }` |
| `POST` | `/api/observations/batch` | Bulk upsert observations | Body: `Observation[]` | `200 OK` → `{ success: true, count }` |

### 6. Offline Dexie Sync (`/api/sync`)

| Method | Endpoint | Description | Request Body / Query | Response Status & Shape |
|--------|----------|-------------|----------------------|-------------------------|
| `POST` | `/api/sync` | Batch upsert Dexie stores (projects, wards, surveys, observations) | `SyncPayload` | `200 OK` → `SyncResponse` |
| `GET` | `/api/sync/status` | Current database counts and synchronization readiness | None | `200 OK` → `SyncStatusResponse` |

### 7. Darwin Core Standard Export (`/api/export/dwc`)

| Method | Endpoint | Description | Request Body / Query | Response Status & Shape |
|--------|----------|-------------|----------------------|-------------------------|
| `GET` | `/api/export/dwc` | Export observations formatted as Darwin Core Occurrence records | Query: `projectId`, `wardId`, `surveyId` | `200 OK` → `{ exportDate, recordCount, records: DarwinCoreRecord[] }` |

---

## Testing & Quality Assurance

Run the complete test suite (both B-Liffe contracts and backwards-compatible routes):
```bash
npm run test:all
```

Run only B-Liffe API contract verification:
```bash
npm test
```

Build TypeScript to `/dist`:
```bash
npm run build
```
