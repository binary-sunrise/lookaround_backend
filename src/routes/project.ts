import { Router } from 'express';
import { prisma } from '../db/client';
import {
  ProjectSearchQuerySchema,
  ProjectSearchResponseSchema,
  BioCollectProjectSchema,
} from '../schemas';

const router = Router();

router.get('/search', async (req, res, next) => {
  try {
    const query = ProjectSearchQuerySchema.parse(req.query);
    const offset = query.offset ?? 0;
    const max = query.max ?? 30;

    const whereClause: any = {};
    if (query.hub) {
      whereClause.hub = { equals: query.hub, mode: 'insensitive' };
    }

    const fqList = Array.isArray(query.fq) ? query.fq : [query.fq];
    for (const fq of fqList) {
      if (fq === 'isExternal:F') {
        whereClause.isExternal = false;
      } else if (fq === 'isExternal:T') {
        whereClause.isExternal = true;
      }
    }

    const searchText = query.q || query.queryText;
    if (searchText) {
      const term = searchText.replace(/\*/g, '').trim();
      if (term) {
        whereClause.OR = [
          { name: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { aim: { contains: term, mode: 'insensitive' } },
        ];
      }
    }

    let orderBy: any = undefined;
    if (query.sort === 'nameSort') {
      orderBy = { name: 'asc' };
    } else if (query.sort === 'dateCreatedSort') {
      orderBy = { startDate: 'desc' };
    }

    const total = await prisma.project.count({ where: whereClause });
    const rawProjects = await prisma.project.findMany({
      where: whereClause,
      include: { surveys: true },
      skip: offset,
      take: max,
      orderBy,
    });

    const projects = rawProjects.map((p) => ({
      ...p,
      links: (p as any).links || [],
      tags: p.tags || [],
      keywords: p.keywords || [],
      scienceType: p.scienceType || [],
      ecoScienceType: p.ecoScienceType || [],
      projectActivities: p.surveys || [],
    }));

    const result = {
      facets: [{ name: 'hub', title: 'Hub', entries: [], total: 0 }],
      total,
      projects,
    };

    const validated = ProjectSearchResponseSchema.parse(result);
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

router.get('/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.project.findUnique({
      where: { projectId },
      include: { activities: true, surveys: true },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const formatted = {
      ...project,
      links: (project as any).links || [],
      tags: project.tags || [],
      keywords: project.keywords || [],
      scienceType: project.scienceType || [],
      ecoScienceType: project.ecoScienceType || [],
      projectActivities: project.surveys || [],
    };
    const validated = BioCollectProjectSchema.parse(formatted);
    res.json(validated);
  } catch (err) {
    next(err);
  }
});

// CREATE Project
const handleCreateProject = async (req: any, res: any, next: any) => {
  try {
    const { CreateProjectSchema } = await import('../schemas');
    const data = CreateProjectSchema.parse(req.body);
    const created = await prisma.project.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        plannedStartDate: data.plannedStartDate,
        plannedEndDate: data.plannedEndDate,
        urlImage: data.urlImage,
        fullSizeImageUrl: data.fullSizeImageUrl,
        urlWeb: data.urlWeb,
        projectLogoImage: data.projectLogoImage,
        projectLogoImageCredit: data.projectLogoImageCredit,
        contactName: data.contactName,
        contactDetails: data.contactDetails,
        projectTask: data.projectTask,
        projectEquipment: data.projectEquipment,
        projectHowToParticipate: data.projectHowToParticipate,
        organisationName: data.organisationName,
        organisationId: data.organisationId,
        aim: data.aim,
        difficulty: data.difficulty,
        isExternal: data.isExternal,
        isSciStarter: data.isSciStarter,
        isMERIT: data.isMERIT,
        projectType: data.projectType,
        hub: data.hub,
        keywords: data.keywords,
        tags: data.tags,
        scienceType: data.scienceType,
        ecoScienceType: data.ecoScienceType,
        rawData: data.rawData,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};
router.post('/create', handleCreateProject);
router.post('/', handleCreateProject);

// UPDATE Project
const handleUpdateProject = async (req: any, res: any, next: any) => {
  try {
    const { projectId } = req.params;
    const { UpdateProjectSchema } = await import('../schemas');
    const data = UpdateProjectSchema.parse(req.body);

    const existing = await prisma.project.findUnique({
      where: { projectId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const updated = await prisma.project.update({
      where: { projectId },
      data,
    });
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};
router.put('/update/:projectId', handleUpdateProject);
router.put('/:projectId', handleUpdateProject);

// DELETE Project
const handleDeleteProject = async (req: any, res: any, next: any) => {
  try {
    const { projectId } = req.params;
    const existing = await prisma.project.findUnique({
      where: { projectId },
    });
    if (!existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    await prisma.project.delete({
      where: { projectId },
    });
    res.status(200).send();
  } catch (err) {
    next(err);
  }
};
router.delete('/delete/:projectId', handleDeleteProject);
router.delete('/:projectId', handleDeleteProject);

export default router;

