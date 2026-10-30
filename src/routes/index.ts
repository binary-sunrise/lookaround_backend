import { Router } from 'express';
import authRouter from './auth';
import profileRouter from './profile';
import projectsRouter from './projects';
import wardsRouter from './wards';
import surveysRouter from './surveys';
import observationsRouter from './observations';
import syncRouter from './sync';
import exportRouter from './export';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/profile', profileRouter);
apiRouter.use('/projects', projectsRouter);
apiRouter.use('/wards', wardsRouter);
apiRouter.use('/surveys', surveysRouter);
apiRouter.use('/observations', observationsRouter);
apiRouter.use('/sync', syncRouter);
apiRouter.use('/export', exportRouter);

export {
  authRouter,
  profileRouter,
  projectsRouter,
  wardsRouter,
  surveysRouter,
  observationsRouter,
  syncRouter,
  exportRouter,
};

export default apiRouter;

