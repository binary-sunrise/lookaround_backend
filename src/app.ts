import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import { extractAuthSession } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import hubRouter from './routes/hub';
import projectRouter from './routes/project';
import surveyRouter from './routes/survey';
import bioactivityRouter from './routes/bioactivity';

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

        // Allow any origin if explicitly enabled or '*' configured (reflects origin for credentials)
        if (process.env.CORS_ALLOW_ALL === 'true' || allowedOrigins.includes('*')) {
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

  // Health check endpoint for cloud platform probes (Render, Fly.io, Koyeb)
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'lookaround_backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Root welcoming endpoint
  app.get('/', (_req, res) => {
    res.status(200).json({
      name: 'LookAround Backend API',
      status: 'online',
      version: '1.0.0',
      health: '/health',
      docs: '/ws/hub/pwaList',
    });
  });

  // Mount Better Auth router on /api/auth/*splat
  app.all('/api/auth/*splat', toNodeHandler(auth));

  // Express body parsers and session extraction for API routes
  app.use(express.json());
  app.use(extractAuthSession);

  // Mount API Contract routes
  app.use('/ws/hub', hubRouter);
  app.use('/ws/project', projectRouter);
  app.use('/ws/survey', surveyRouter);
  app.use('/ws/bioactivity', bioactivityRouter);

  // Catch-all 404 for unknown endpoints
  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}

export const app = createApp();
