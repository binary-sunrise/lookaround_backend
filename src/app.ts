import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { extractAuthToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import hubRouter from './routes/hub';
import projectRouter from './routes/project';
import surveyRouter from './routes/survey';
import bioactivityRouter from './routes/bioactivity';

dotenv.config();

export function createApp() {
  const app = express();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Middleware
  app.use(
    cors({
      origin: [frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(extractAuthToken);

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
