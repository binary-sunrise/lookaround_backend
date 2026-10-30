import { prisma } from '../src/db/client';
import { hashPassword } from 'better-auth/crypto';

export async function main() {
  console.log('🌱 Starting database seed pipeline...');

  // 1. Seed Auth Users
  const users = [
    {
      id: 'user-veena',
      sub: 'mock-user-veena-001',
      name: 'Veena V',
      givenName: 'Veena',
      familyName: 'V',
      email: 'veena@field.b-liffe.org',
      role: 'Lead Researcher',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      customUserId: 'mock-user-veena-001',
      organisation: 'Kerala Forest Research Institute',
      avatar: 'VV',
    },
    {
      id: 'user-jane',
      sub: 'mock-user-jane-002',
      name: 'Dr. Jane Goodall',
      givenName: 'Jane',
      familyName: 'Goodall',
      email: 'jane@field.b-liffe.org',
      role: 'Senior Ecologist',
      roles: ['ROLE_USER'],
      customUserId: 'mock-user-jane-002',
      organisation: 'B-Liffe Research Network',
      avatar: 'JG',
    },
  ];

  console.log(`[Seed] Seeding ${users.length} users...`);
  const defaultPasswordHash = await hashPassword('Password123!');

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        sub: user.sub,
        name: user.name,
        givenName: user.givenName,
        familyName: user.familyName,
        email: user.email,
        emailVerified: true,
        role: user.role,
        roles: user.roles,
        customUserId: user.customUserId,
        avatar: user.avatar,
        organisation: user.organisation,
      },
      create: {
        id: user.id,
        sub: user.sub,
        name: user.name,
        givenName: user.givenName,
        familyName: user.familyName,
        email: user.email,
        emailVerified: true,
        role: user.role,
        roles: user.roles,
        customUserId: user.customUserId,
        avatar: user.avatar,
        organisation: user.organisation,
        accounts: {
          create: {
            id: `account-${user.id}`,
            accountId: user.email,
            providerId: 'credential',
            password: defaultPasswordHash,
          },
        },
      },
    });
  }

  // 2. Seed B-Liffe Domain Entities
  console.log('[Seed] Seeding B-Liffe domain data...');

  await prisma.userProfile.upsert({
    where: { email: 'veena@field.b-liffe.org' },
    update: {
      fullName: 'Veena V',
      displayName: 'Veena',
      bio: 'Biodiversity enthusiast & field observer documenting flora, fauna, and local ecosystems.',
      avatarType: 'preset',
      avatarPresetId: 'user',
    },
    create: {
      id: 'profile-demo-veena',
      userId: 'user-veena',
      fullName: 'Veena V',
      displayName: 'Veena',
      email: 'veena@field.b-liffe.org',
      bio: 'Biodiversity enthusiast & field observer documenting flora, fauna, and local ecosystems.',
      avatarType: 'preset',
      avatarPresetId: 'user',
    },
  });

  const defaultProject = await prisma.bLiffeProject.upsert({
    where: { id: 'proj-tvm-biodiversity-2026' },
    update: {
      name: 'Thiruvananthapuram City Biodiversity Register',
      description: 'Comprehensive municipal ward-level documentation of urban flora, fauna, and local ecosystems.',
      organization: 'Kerala State Biodiversity Board',
      targetRegion: 'Thiruvananthapuram Municipal Corporation',
      status: 'active',
    },
    create: {
      id: 'proj-tvm-biodiversity-2026',
      name: 'Thiruvananthapuram City Biodiversity Register',
      description: 'Comprehensive municipal ward-level documentation of urban flora, fauna, and local ecosystems.',
      organization: 'Kerala State Biodiversity Board',
      targetRegion: 'Thiruvananthapuram Municipal Corporation',
      status: 'active',
      syncStatus: 'synced',
    },
  });

  const defaultWard = await prisma.bLiffeWard.upsert({
    where: { id: 'TVM-WARD-014' },
    update: {
      wardNumber: '14',
      wardName: 'Palayam',
      localBodyName: 'Thiruvananthapuram Municipal Corporation',
      district: 'Thiruvananthapuram',
      state: 'Kerala',
      keyLandmarks: 'University Stadium, Public Library, Secretariat',
    },
    create: {
      id: 'TVM-WARD-014',
      projectId: defaultProject.id,
      wardNumber: '14',
      wardName: 'Palayam',
      localBodyName: 'Thiruvananthapuram Municipal Corporation',
      district: 'Thiruvananthapuram',
      state: 'Kerala',
      keyLandmarks: 'University Stadium, Public Library, Secretariat',
      syncStatus: 'synced',
    },
  });

  const defaultSurvey = await prisma.bLiffeSurvey.upsert({
    where: { id: 'survey-tvm-urban-001' },
    update: {
      leadObserver: 'Veena V',
      teamMembers: ['Veena V', 'Anand M'],
      surveyMethod: 'Opportunistic Encounter',
      habitatType: 'Urban Park / Garden',
      targetGroup: 'All Biodiversity',
    },
    create: {
      id: 'survey-tvm-urban-001',
      projectId: defaultProject.id,
      wardId: defaultWard.id,
      leadObserver: 'Veena V',
      teamMembers: ['Veena V', 'Anand M'],
      surveyMethod: 'Opportunistic Encounter',
      habitatType: 'Urban Park / Garden',
      targetGroup: 'All Biodiversity',
      startTime: '2026-10-30T07:30:00.000Z',
      weatherNotes: 'Clear sky, pleasant morning breeze, 27°C',
      syncStatus: 'synced',
    },
  });

  await prisma.bLiffeObservation.upsert({
    where: { id: 'obs-birdwing-001' },
    update: {
      speciesName: 'Southern Birdwing',
      scientificName: 'Troides minos',
      localName: 'ഗരുഡശലഭം',
      speciesGroup: 'Insects / Butterflies',
      notes: 'State butterfly of Kerala observed nectaring on Pagoda flowers near the Museum garden.',
      tags: ['state-butterfly', 'canopy-dwelling', 'pollinator'],
    },
    create: {
      id: 'obs-birdwing-001',
      projectId: defaultProject.id,
      projectIds: [defaultProject.id],
      wardId: defaultWard.id,
      wardName: 'Ward 14 – Palayam',
      surveyId: defaultSurvey.id,
      speciesName: 'Southern Birdwing',
      scientificName: 'Troides minos',
      localName: 'ഗരുഡശലഭം',
      speciesGroup: 'Insects / Butterflies',
      identificationStatus: 'Identified',
      organismStatus: 'Wild',
      locationVisibility: 'Open',
      basis_of_record: 'HumanObservation',
      tags: ['state-butterfly', 'canopy-dwelling', 'pollinator'],
      notes: 'State butterfly of Kerala observed nectaring on Pagoda flowers near the Museum garden.',
      individualCount: 1,
      lifeStage: 'Adult',
      microHabitat: 'Tree Canopy',
      hasTraditionalKnowledge: 'No',
      latitude: 8.4982,
      longitude: 76.9534,
      accuracyMeters: 4.0,
      location_source: 'GPS',
      observationAt: '2026-10-30T08:15:00.000Z',
      recordedAt: '2026-10-30T08:15:00.000Z',
      photos: ['https://images.unsplash.com/photo-1544979590-37e9b47eb705'],
      verificationStatus: 'Validated',
      verifiedBy: 'KFRI Entomologist',
      syncStatus: 'synced',
    },
  });

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
