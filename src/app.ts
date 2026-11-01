import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import { extractAuthSession } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

// B-Liffe routes
import apiRouter, {
  authRouter,
  profileRouter,
  projectsRouter,
  wardsRouter,
  surveysRouter,
  observationsRouter,
  syncRouter,
  exportRouter,
} from './routes';

dotenv.config();

export function createApp() {
  const app = express();
  const defaultOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  const configuredOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  ]
    .filter(Boolean)
    .map((origin) => origin!.trim());

  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...configuredOrigins]));

  // Enable CORS with credentials for HTTP-only cookies and cross-origin requests
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
        if (!origin) return callback(null, true);

        // Allow any origin if explicitly enabled or '*' configured
        if (process.env.CORS_ALLOW_ALL === 'true' || allowedOrigins.includes('*')) {
          return callback(null, true);
        }

        // Allow all Vercel deployments (*.vercel.app)
        if (origin.endsWith('.vercel.app')) {
          return callback(null, true);
        }

        // Match against allowed origin list
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Allow during non-production local development
        if (process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }

        return callback(new Error(`CORS policy: Origin ${origin} not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    })
  );

  // Health check endpoint for cloud probes
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: process.env.SERVICE_NAME || 'b-liffe-backend',
      application: process.env.APP_NAME || 'B-Liffe Biodiversity Field Data API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Root welcoming endpoint with full API discovery map
  app.get('/', (_req, res) => {
    res.status(200).json({
      name: process.env.APP_NAME || 'B-Liffe Biodiversity Field Data API',
      status: 'online',
      version: process.env.APP_VERSION || '2.0.0',
      health: '/health',
      endpoints: {
        auth: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login',
          logout: 'POST /api/auth/logout',
          me: 'GET /api/auth/me',
        },
        profile: {
          get: 'GET /api/profile (or /api/v1/profile)',
          update: 'PUT /api/profile (or /api/v1/profile)',
        },
        projects: {
          list: 'GET /api/projects',
          create: 'POST /api/projects',
          get: 'GET /api/projects/:id',
          update: 'PUT /api/projects/:id',
          delete: 'DELETE /api/projects/:id',
          wards: 'GET /api/projects/:projectId/wards',
        },
        wards: {
          identify: 'POST /api/wards/identify (GPS spatial point-matching)',
          list: 'GET /api/wards',
          create: 'POST /api/wards',
          get: 'GET /api/wards/:id',
          update: 'PUT /api/wards/:id',
          delete: 'DELETE /api/wards/:id',
        },
        surveys: {
          list: 'GET /api/surveys',
          create: 'POST /api/surveys',
          get: 'GET /api/surveys/:id',
          update: 'PUT /api/surveys/:id',
          delete: 'DELETE /api/surveys/:id',
        },
        observations: {
          list: 'GET /api/observations',
          create: 'POST /api/observations',
          get: 'GET /api/observations/:id',
          update: 'PUT /api/observations/:id',
          delete: 'DELETE /api/observations/:id',
          batch: 'POST /api/observations/batch',
        },
        sync: {
          batch: 'POST /api/sync',
          status: 'GET /api/sync/status',
        },
        export: {
          darwinCore: 'GET /api/export/dwc',
        },
      },
    });
  });

  // Express body parsers (configurable limit, defaults to 50mb for base64 field photos)
  const bodyLimit = process.env.BODY_LIMIT || '50mb';
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
  app.use(extractAuthSession);

  // Mount B-Liffe Auth & Profile routes (both /auth and /api/auth supported)
  app.use('/auth', authRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/v1/profile', profileRouter);
  app.use('/api/profile', profileRouter);

  // Mount Better Auth router on /api/auth/*splat for social / oauth flows
  app.all('/api/auth/*splat', toNodeHandler(auth));

  // Mount B-Liffe Domain API Routes
  app.use('/api', apiRouter);

  // Hierarchical route aliases matching B-Liffe frontend navigation URLs
  app.use('/api/projects/:projectId/wards/:wardId/surveys', surveysRouter);
  app.use('/api/projects/:projectId/wards', wardsRouter);

  // Catch-all 404 for unknown endpoints
  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}

export const app = createApp();
