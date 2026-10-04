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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Enable CORS with credentials for HTTP-only cookies and cross-origin requests
  app.use(
    cors({
      origin: [frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    })
  );

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
