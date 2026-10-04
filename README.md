# lookaround_backend

Lightweight, contract-conforming backend service for the BioCollect PWA (LookAround).

## Technology Stack

- **Runtime & Language**: Node.js (v20+) with TypeScript (CommonJS / tsx / tsc)
- **Web Framework**: Express 5 (`express@^5.2.1`) with CORS middleware and centralized error handling
- **Data Validation**: Zod (`zod@^4.6.5`) schemas strictly adhering to the ALA BioCollect PWA contract
- **Database Engine**: PostgreSQL 16 Alpine via Docker Compose
- **ORM & Migrations**: Prisma ORM (`@prisma/client` and `prisma CLI`)

---

## Database Quickstart from Scratch

### 1. Prerequisites
Ensure you have installed:
- [Node.js](https://nodejs.org/) (v20 or later)
- [Docker & Docker Compose](https://www.docker.com/) (Ensure Docker Desktop daemon is running)

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default connection values for local containerized PostgreSQL:
```env
PORT=3000
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=lookaround_db

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=lookaround_db

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lookaround_db?schema=public"
```

### 3. Start Database Container
Launch the PostgreSQL 16 container with health checks and volume persistence:
```bash
npm run db:start
# or using Make
make db-start
```
The health check will monitor database readiness via `pg_isready`.

### 4. Run Migrations
Apply the database schema and create all tables and indexes:
```bash
npm run db:migrate
# or using Make
make db-migrate
```
*(For development schema iterations, use `npm run db:migrate:dev`).*

### 5. Seed Initial Development Data
Inject initial seed datasets (Hubs, Projects, Surveys, BioActivities, Users) from `data/*.json`:
```bash
npm run db:seed
# or using Make
make db-seed
```

### 6. (Optional) Inspect Database via UI
Open Prisma Studio to inspect and edit tables in your browser:
```bash
npm run db:studio
# or using Make
make db-studio
```

### 7. Run the Application
Start the backend server in development mode:
```bash
npm run dev
```

---

## Database Lifecycle Scripts

Standard lifecycle scripts are configured in both `package.json` and `Makefile`:

| Lifecycle Action | NPM Command | Make Command | Description |
|------------------|-------------|--------------|-------------|
| **Start DB** | `npm run db:start` | `make db-start` | Starts the PostgreSQL container in background with volume persistence and health checks |
| **Stop DB** | `npm run db:stop` | `make db-stop` | Stops and tears down the PostgreSQL container |
| **Migrate** | `npm run db:migrate` | `make db-migrate` | Applies all pending migrations (`prisma migrate deploy`) |
| **Migrate (Dev)**| `npm run db:migrate:dev` | — | Creates and applies new migrations interactively (`prisma migrate dev`) |
| **Seed** | `npm run db:seed` | `make db-seed` | Populates database with local development seed data (`tsx prisma/seed.ts`) |
| **Reset** | `npm run db:reset` | `make db-reset` | Drops database, re-applies all migrations, and runs seed script |
| **Prisma Studio**| `npm run db:studio` | `make db-studio` | Launches web UI at `http://localhost:5555` to browse data |

---

## Testing & Quality Assurance

Run the automated test suite (verifying contract conformance, schemas, and endpoints):
```bash
npm test
```

Build for production:
```bash
npm run build
```

---

## API Route Specification

Strictly adheres to the LookAround PWA Backend API Contract.

| Method | Endpoint | Description | Request Parameters | Response Status & Shape |
|--------|----------|-------------|--------------------|-------------------------|
| `GET` | `/ws/hub/pwaList` | List available hubs | None | `200 OK` → `Array<BioCollectHub>` |
| `GET` | `/ws/project/search` | Search projects with facets & pagination | Query: `fq` (required), `hub`, `q`, `queryText`, `sort`, `max`, `offset`, `mobile`, `initiator`, `isUserPage` | `200 OK` → `{ facets: Facet[], total: number, projects: BioCollectProject[] }`<br>`400 Bad Request` if `fq` missing |
| `GET` | `/ws/project/:projectId` | Get full project details with activities | Param: `projectId` (string) | `200 OK` → `BioCollectProject`<br>`404 Not Found` if missing |
| `GET` | `/ws/survey/list/:projectId` | List surveys/activities for a project | Param: `projectId` (string) | `200 OK` → `Array<BioCollectSurvey>` |
| `GET` | `/ws/bioactivity/search` | Search user submissions | Query: `view` (required: `myrecords`, `project`, `allrecords`), `projectId`, `searchTerm`, `offset`, `max`<br>Header: `Authorization: Bearer <token>` | `200 OK` → `{ activities: BioCollectBioActivity[] }`<br>`400 Bad Request` if `view` missing/invalid |
| `DELETE` | `/ws/bioactivity/delete/:activityId` | Delete a bioactivity submission | Param: `activityId` (string)<br>Header: `Authorization: Bearer <token>` | `200 OK` → **Void** (empty response body)<br>`404 Not Found` if missing |

---

## Project Architecture

```
lookaround_backend/
├── docker-compose.yml       # PostgreSQL 16 service with volume persistence & health checks
├── Makefile                 # Make targets for db lifecycle commands
├── prisma/
│   ├── schema.prisma        # Database models (Hub, Project, Survey, BioActivity, User)
│   ├── migrations/          # Version-controlled SQL migration scripts
│   └── seed.ts              # Seeding script importing data/*.json into PostgreSQL
├── prisma.config.ts         # Prisma configuration
├── data/                    # Seed and fixture JSON files
├── src/
│   ├── app.ts               # Express application setup & middleware
│   ├── index.ts             # Server entry point
│   ├── schemas.ts           # Zod validation schemas strictly matching API contract
│   ├── db/
│   │   └── client.ts        # Typed PrismaClient instance
│   ├── middleware/
│   │   ├── auth.ts          # Bearer token extractor & auth validator
│   │   └── errorHandler.ts  # Standardized error handler
│   ├── routes/
│   │   ├── hub.ts           # /ws/hub/pwaList
│   │   ├── project.ts       # /ws/project/search, /ws/project/:projectId
│   │   ├── survey.ts        # /ws/survey/list/:projectId
│   │   └── bioactivity.ts   # /ws/bioactivity/search, /ws/bioactivity/delete/:activityId
│   └── services/
│       └── store.ts         # Contract query handler with JSON persistence & reset
└── test/
    └── api.test.ts          # 22 automated integration tests verifying contract conformance
```
