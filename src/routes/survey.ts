import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { BioCollectSurveySchema } from '../schemas';

const router = Router();

// GET /ws/survey/list/:projectId
router.get('/list/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const surveys = await prisma.survey.findMany({
      where: { projectId },
    });
    const validated = z.array(BioCollectSurveySchema).parse(surveys);
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

// GET /ws/survey/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const survey = await prisma.survey.findUnique({
      where: { id },
    });
    if (!survey) {
      res.status(404).json({ error: 'Survey not found' });
      return;
    }
    const validated = BioCollectSurveySchema.parse(survey);
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

// CREATE /ws/survey/create
const handleCreateSurvey = async (req: any, res: any, next: any) => {
  try {
    const { CreateSurveySchema } = await import('../schemas');
    const data = CreateSurveySchema.parse(req.body);
    const created = await prisma.survey.create({
      data,
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};
router.post('/create', handleCreateSurvey);
router.post('/', handleCreateSurvey);

// UPDATE /ws/survey/update/:id
const handleUpdateSurvey = async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { UpdateSurveySchema } = await import('../schemas');
    const data = UpdateSurveySchema.parse(req.body);

    const existing = await prisma.survey.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Survey not found' });
      return;
    }

    const updated = await prisma.survey.update({
      where: { id },
      data,
    });
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};
router.put('/update/:id', handleUpdateSurvey);
router.put('/:id', handleUpdateSurvey);

// DELETE /ws/survey/delete/:id
const handleDeleteSurvey = async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const existing = await prisma.survey.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Survey not found' });
      return;
    }

    await prisma.survey.delete({
      where: { id },
    });
    res.status(200).send();
  } catch (err) {
    next(err);
  }
};
router.delete('/delete/:id', handleDeleteSurvey);
router.delete('/:id', handleDeleteSurvey);

export default router;

