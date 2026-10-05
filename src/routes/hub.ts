import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { BioCollectHubSchema } from '../schemas';

const router = Router();

// GET /ws/hub/pwaList
router.get('/pwaList', async (_req, res, next) => {
  try {
    const hubs = await prisma.hub.findMany();
    const validated = z.array(BioCollectHubSchema).parse(hubs);
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

// CREATE /ws/hub/create
const handleCreateHub = async (req: any, res: any, next: any) => {
  try {
    const { CreateHubSchema } = await import('../schemas');
    const data = CreateHubSchema.parse(req.body);
    const created = await prisma.hub.create({
      data,
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};
router.post('/create', handleCreateHub);
router.post('/', handleCreateHub);

// UPDATE /ws/hub/update/:id
const handleUpdateHub = async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { UpdateHubSchema } = await import('../schemas');
    const data = UpdateHubSchema.parse(req.body);

    const existing = await prisma.hub.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Hub not found' });
      return;
    }

    const updated = await prisma.hub.update({
      where: { id },
      data,
    });
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};
router.put('/update/:id', handleUpdateHub);
router.put('/:id', handleUpdateHub);

// DELETE /ws/hub/delete/:id
const handleDeleteHub = async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const existing = await prisma.hub.findUnique({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Hub not found' });
      return;
    }

    await prisma.hub.delete({
      where: { id },
    });
    res.status(200).send();
  } catch (err) {
    next(err);
  }
};
router.delete('/delete/:id', handleDeleteHub);
router.delete('/:id', handleDeleteHub);

export default router;

