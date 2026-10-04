import fs from 'fs';
import path from 'path';
import { prisma } from '../src/db/client';
import { hashPassword } from 'better-auth/crypto';

function loadJson<T>(fileName: string): T[] {
  const filePath = path.join(__dirname, '../data', fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`[Seed] Warning: Data file ${fileName} not found at ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

export async function main() {
  console.log('🌱 Starting database seed pipeline...');

  // 1. Seed Hubs
  const rawHubs = loadJson<any>('hubs.json');
  console.log(`[Seed] Seeding ${rawHubs.length} hubs...`);
  for (const hub of rawHubs) {
    await prisma.hub.upsert({
      where: { id: hub.id },
      update: {
        url: hub.url || hub.id,
        name: hub.name,
        description: hub.description || '',
        logo: hub.logo || '',
      },
      create: {
        id: hub.id,
        url: hub.url || hub.id,
        name: hub.name,
        description: hub.description || '',
        logo: hub.logo || '',
      },
    });
  }

  // 2. Seed Users
  const rawUsers = loadJson<any>('users.json');
  console.log(`[Seed] Seeding ${rawUsers.length} users...`);
  for (const user of rawUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        sub: user.sub,
        name: user.name,
        givenName: user.given_name || user.givenName || null,
        familyName: user.family_name || user.familyName || null,
        email: user.email,
        emailVerified: user.email_verified ?? true,
        role: user.role || null,
        roles: Array.isArray(user.roles) ? user.roles : [],
        customUserId: user['custom:userid'] || user.customUserId || null,
        avatar: user.avatar || null,
        organisation: user.organisation || null,
      },
      create: {
        id: user.id,
        sub: user.sub,
        name: user.name,
        givenName: user.given_name || user.givenName || null,
        familyName: user.family_name || user.familyName || null,
        email: user.email,
        emailVerified: user.email_verified ?? true,
        role: user.role || null,
        roles: Array.isArray(user.roles) ? user.roles : [],
        customUserId: user['custom:userid'] || user.customUserId || null,
        avatar: user.avatar || null,
        organisation: user.organisation || null,
        image: user.avatar ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}` : null,
      },
    });

    // Create credential account for Better Auth login
    const defaultPasswordHash = await hashPassword('Password123!');
    await prisma.account.upsert({
      where: { id: `acc-${user.id}` },
      update: {
        password: defaultPasswordHash,
      },
      create: {
        id: `acc-${user.id}`,
        accountId: user.id,
        providerId: 'credential',
        userId: user.id,
        password: defaultPasswordHash,
      },
    });
  }

  // 3. Seed Projects
  const rawProjects = loadJson<any>('projects.json');
  console.log(`[Seed] Seeding ${rawProjects.length} projects...`);
  const projectIds = new Set<string>();

  for (const proj of rawProjects) {
    projectIds.add(proj.projectId);
    await prisma.project.upsert({
      where: { projectId: proj.projectId },
      update: {
        name: proj.name,
        description: proj.description || '',
        startDate: proj.startDate || null,
        endDate: proj.endDate || null,
        plannedStartDate: proj.plannedStartDate || null,
        plannedEndDate: proj.plannedEndDate || null,
        urlImage: proj.urlImage || null,
        fullSizeImageUrl: proj.fullSizeImageUrl || null,
        urlWeb: proj.urlWeb || null,
        projectLogoImage: proj.projectLogoImage || null,
        projectLogoImageCredit: proj.projectLogoImageCredit || null,
        contactName: proj.contactName || null,
        contactDetails: proj.contactDetails || null,
        projectTask: proj.projectTask || null,
        projectEquipment: proj.projectEquipment || null,
        projectHowToParticipate: proj.projectHowToParticipate || null,
        organisationName: proj.organisationName || '',
        organisationId: proj.organisationId || null,
        aim: proj.aim || null,
        difficulty: proj.difficulty || null,
        isExternal: Boolean(proj.isExternal),
        isSciStarter: Boolean(proj.isSciStarter),
        isMERIT: Boolean(proj.isMERIT),
        projectType: proj.projectType || 'citizenScience',
        hub: proj.hub || null,
        keywords: Array.isArray(proj.keywords) ? proj.keywords : [],
        tags: Array.isArray(proj.tags) ? proj.tags : [],
        scienceType: Array.isArray(proj.scienceType) ? proj.scienceType : [],
        ecoScienceType: Array.isArray(proj.ecoScienceType) ? proj.ecoScienceType : [],
        rawData: proj,
      },
      create: {
        projectId: proj.projectId,
        name: proj.name,
        description: proj.description || '',
        startDate: proj.startDate || null,
        endDate: proj.endDate || null,
        plannedStartDate: proj.plannedStartDate || null,
        plannedEndDate: proj.plannedEndDate || null,
        urlImage: proj.urlImage || null,
        fullSizeImageUrl: proj.fullSizeImageUrl || null,
        urlWeb: proj.urlWeb || null,
        projectLogoImage: proj.projectLogoImage || null,
        projectLogoImageCredit: proj.projectLogoImageCredit || null,
        contactName: proj.contactName || null,
        contactDetails: proj.contactDetails || null,
        projectTask: proj.projectTask || null,
        projectEquipment: proj.projectEquipment || null,
        projectHowToParticipate: proj.projectHowToParticipate || null,
        organisationName: proj.organisationName || '',
        organisationId: proj.organisationId || null,
        aim: proj.aim || null,
        difficulty: proj.difficulty || null,
        isExternal: Boolean(proj.isExternal),
        isSciStarter: Boolean(proj.isSciStarter),
        isMERIT: Boolean(proj.isMERIT),
        projectType: proj.projectType || 'citizenScience',
        hub: proj.hub || null,
        keywords: Array.isArray(proj.keywords) ? proj.keywords : [],
        tags: Array.isArray(proj.tags) ? proj.tags : [],
        scienceType: Array.isArray(proj.scienceType) ? proj.scienceType : [],
        ecoScienceType: Array.isArray(proj.ecoScienceType) ? proj.ecoScienceType : [],
        rawData: proj,
      },
    });
  }

  // 4. Seed Surveys
  const rawSurveys = loadJson<any>('surveys.json');
  console.log(`[Seed] Seeding ${rawSurveys.length} surveys...`);
  for (const survey of rawSurveys) {
    const validProjectId = survey.projectId && projectIds.has(survey.projectId) ? survey.projectId : null;
    await prisma.survey.upsert({
      where: { id: survey.id },
      update: {
        projectActivityId: survey.projectActivityId || null,
        name: survey.name,
        description: survey.description || '',
        startDate: survey.startDate || null,
        endDate: survey.endDate || null,
        status: survey.status || 'Active',
        published: survey.published ?? true,
        publicAccess: survey.publicAccess ?? true,
        projectId: validProjectId,
        rawData: survey,
      },
      create: {
        id: survey.id,
        projectActivityId: survey.projectActivityId || null,
        name: survey.name,
        description: survey.description || '',
        startDate: survey.startDate || null,
        endDate: survey.endDate || null,
        status: survey.status || 'Active',
        published: survey.published ?? true,
        publicAccess: survey.publicAccess ?? true,
        projectId: validProjectId,
        rawData: survey,
      },
    });
  }

  // 5. Seed Activities
  const rawActivities = loadJson<any>('activities.json');
  console.log(`[Seed] Seeding ${rawActivities.length} bio activities...`);
  for (const act of rawActivities) {
    const validProjectId = act.projectId && projectIds.has(act.projectId) ? act.projectId : null;
    await prisma.bioActivity.upsert({
      where: { activityId: act.activityId },
      update: {
        projectActivityId: act.projectActivityId,
        type: act.type || 'BioBlitz Observation Form',
        status: act.status || 'active',
        lastUpdated: act.lastUpdated || new Date().toISOString(),
        endDate: act.endDate || null,
        userId: act.userId,
        name: act.name,
        projectName: act.projectName || '',
        projectId: validProjectId,
        activityOwnerName: act.activityOwnerName || null,
        siteId: act.siteId || null,
        embargoed: Boolean(act.embargoed),
        embargoUntil: act.embargoUntil || '',
        projectType: act.projectType || null,
        thumbnailUrl: act.thumbnailUrl || null,
        showCrud: act.showCrud ?? true,
        userCanModerate: act.userCanModerate ?? true,
        records: act.records || [],
        rawData: act,
      },
      create: {
        activityId: act.activityId,
        projectActivityId: act.projectActivityId,
        type: act.type || 'BioBlitz Observation Form',
        status: act.status || 'active',
        lastUpdated: act.lastUpdated || new Date().toISOString(),
        endDate: act.endDate || null,
        userId: act.userId,
        name: act.name,
        projectName: act.projectName || '',
        projectId: validProjectId,
        activityOwnerName: act.activityOwnerName || null,
        siteId: act.siteId || null,
        embargoed: Boolean(act.embargoed),
        embargoUntil: act.embargoUntil || '',
        projectType: act.projectType || null,
        thumbnailUrl: act.thumbnailUrl || null,
        showCrud: act.showCrud ?? true,
        userCanModerate: act.userCanModerate ?? true,
        records: act.records || [],
        rawData: act,
      },
    });
  }

  console.log('✅ Database seeding finished successfully.');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Seeding failed with error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
