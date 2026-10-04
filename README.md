# lookaround_backend

Lightweight, contract-conforming backend service for the BioCollect PWA (LookAround).

## Setup Instructions

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   The `.env.example` file outlines the needed environment variables. Create a `.env` file from it:
   ```bash
   cp .env.example .env
   ```
   
   - `PORT`: Port the server runs on (default: `3000`)
   - `FRONTEND_URL`: URL of the frontend development server (default: `http://localhost:5173`). Used for CORS.

3. **Development & Testing**
   - Start Dev Server:
     ```bash
     npm run dev
     ```
   - Run Automated Test Suite:
     ```bash
     npm test
     ```
   - Build for Production:
     ```bash
     npm run build
     ```
   - Start Production Server:
     ```bash
     npm start
     ```

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

## Project Architecture

```
src/
├── app.ts                  # Express application setup & middleware (CORS, JSON, Auth, Error Handler)
├── index.ts                # Server entry point (app.listen)
├── schemas.ts              # Zod validation schemas strictly matching API contract
├── middleware/
│   ├── auth.ts             # Bearer token extractor & auth validator
│   └── errorHandler.ts     # Standardized error handler (400 Zod validation, 500 server error)
├── routes/
│   ├── hub.ts              # /ws/hub/pwaList
│   ├── project.ts          # /ws/project/search, /ws/project/:projectId
│   ├── survey.ts           # /ws/survey/list/:projectId
│   └── bioactivity.ts      # /ws/bioactivity/search, /ws/bioactivity/delete/:activityId
└── services/
    └── store.ts            # In-memory data store with JSON persistence, query filtering & reset
test/
└── api.test.ts             # 22 automated integration tests verifying contract conformance & edge cases
```
# lookaround_backend
