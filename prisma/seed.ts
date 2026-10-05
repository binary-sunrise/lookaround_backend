import { prisma } from '../src/db/client';
import { hashPassword } from 'better-auth/crypto';

export async function main() {
  console.log('🌱 Starting database seed pipeline...');

  // 1. Seed Hubs
  const hubs = [
    {
      id: 'acsa',
      url: 'acsa',
      name: 'Australian Citizen Science Association (ACSA)',
      description: 'Advancing citizen science through knowledge sharing and biodiversity mapping.',
      logo: 'https://biocollect.ala.org.au/static/images/acsa-logo.png',
    },
    {
      id: 'ala',
      url: 'ala',
      name: 'Atlas of Living Australia',
      description: "Australia's national biodiversity database providing open access to vast species datasets.",
      logo: 'https://biocollect.ala.org.au/static/images/ala-logo.png',
    },
    {
      id: 'kfri',
      url: 'kfri',
      name: 'Kerala Forest Research Institute (KFRI)',
      description: 'Scientific research on forestry, biodiversity conservation, and tropical ecosystem monitoring.',
      logo: 'https://biocollect.ala.org.au/static/images/kfri-logo.png',
    },
  ];

  console.log(`[Seed] Seeding ${hubs.length} hubs...`);
  for (const hub of hubs) {
    await prisma.hub.upsert({
      where: { id: hub.id },
      update: hub,
      create: hub,
    });
  }

  // 2. Seed Users
  const users = [
    {
      id: 'user-alex',
      sub: 'mock-user-ecologist-001',
      name: 'Alex Citizen',
      givenName: 'Alex',
      familyName: 'Citizen',
      email: 'alex.citizen@ala.org.au',
      role: 'Researcher',
      roles: ['ROLE_USER', 'ROLE_FC_ADMIN'],
      customUserId: 'mock-user-ecologist-001',
      organisation: 'Atlas of Living Australia',
      avatar: 'AC',
    },
    {
      id: 'user-jane',
      sub: 'mock-user-jane-002',
      name: 'Jane Volunteer',
      givenName: 'Jane',
      familyName: 'Volunteer',
      email: 'jane.volunteer@kfri.res.in',
      role: 'Field Volunteer',
      roles: ['ROLE_USER'],
      customUserId: 'mock-user-jane-002',
      organisation: 'Kerala Forest Research Institute',
      avatar: 'JV',
    },
    {
      id: 'user-nair',
      sub: 'mock-user-nair-003',
      name: 'Dr. K. S. Nair',
      givenName: 'K. S.',
      familyName: 'Nair',
      email: 'dr.nair@kfri.res.in',
      role: 'Principal Scientist',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      customUserId: 'mock-user-nair-003',
      organisation: 'KFRI Entomology Department',
      avatar: 'KN',
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
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`,
      },
    });

    await prisma.account.upsert({
      where: { id: `acc-${user.id}` },
      update: { password: defaultPasswordHash },
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
  const projects = [
    {
      projectId: 'proj-gsb-01',
      name: 'Great Southern BioBlitz 2026',
      description: 'An international citizen science event recording biodiversity across the Southern Hemisphere.',
      aim: 'Map flora and fauna biodiversity in southern ecosystems with community participation.',
      organisationName: 'Australian Citizen Science Association',
      hub: 'acsa',
      isExternal: false,
      startDate: '2026-09-01T00:00:00Z',
      endDate: '2026-10-31T23:59:59Z',
      urlImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    },
    {
      projectId: 'proj-abc-02',
      name: 'Aussie Backyard Bird Count',
      description: 'Annual week-long bird observation count across Australian urban and rural habitats.',
      aim: 'Monitor common native bird populations in urban greenspaces and gardens.',
      organisationName: 'BirdLife Australia',
      hub: 'acsa',
      isExternal: false,
      startDate: '2026-10-15T00:00:00Z',
      endDate: '2026-10-22T23:59:59Z',
      urlImage: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=600&q=80',
    },
    {
      projectId: 'proj-kfri-01',
      name: 'KFRI Western Ghats Flora Mapping',
      description: 'Documenting endemic floral species and botanical diversity across Peechi-Vazhani Wildlife Sanctuary.',
      aim: 'Identify and catalog endangered medicinal plants and orchids of Kerala evergreen forests.',
      organisationName: 'Kerala Forest Research Institute',
      hub: 'kfri',
      isExternal: false,
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
      urlImage: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
    },
    {
      projectId: 'proj-kfri-02',
      name: 'KFRI Forest Insect Biodiversity Survey',
      description: 'Long-term monitoring of canopy insects, pollinators, and forest defoliators.',
      aim: 'Track insect species health and detect early pest outbreaks in teak and rosewood plantations.',
      organisationName: 'Kerala Forest Research Institute',
      hub: 'kfri',
      isExternal: false,
      startDate: '2026-03-01T00:00:00Z',
      endDate: '2026-11-30T23:59:59Z',
      urlImage: 'https://images.unsplash.com/photo-1534361960057-19889db98a1e?auto=format&fit=crop&w=600&q=80',
    },
  ];

  console.log(`[Seed] Seeding ${projects.length} projects...`);
  for (const proj of projects) {
    await prisma.project.upsert({
      where: { projectId: proj.projectId },
      update: proj,
      create: proj,
    });
  }

  // 4. Seed Surveys
  const surveys = [
    {
      id: 'pa-gsb-01',
      projectActivityId: 'pa-gsb-01',
      name: 'BioBlitz Observation Form',
      description: 'Record wild plants, animals, insects, and fungi observed during the bioblitz.',
      projectId: 'proj-gsb-01',
      published: true,
      publicAccess: true,
      status: 'Active',
      startDate: '2026-09-01T00:00:00Z',
    },
    {
      id: 'pa-gsb-02',
      projectActivityId: 'pa-gsb-02',
      name: 'Nocturnal Spotlight Survey',
      description: 'Night survey for bats, owls, possums, and nocturnal amphibians.',
      projectId: 'proj-gsb-01',
      published: true,
      publicAccess: true,
      status: 'Active',
      startDate: '2026-09-01T00:00:00Z',
    },
    {
      id: 'pa-abc-01',
      projectActivityId: 'pa-abc-01',
      name: 'Aussie Bird Count 20-min Form',
      description: 'Spend 20 minutes in your favorite outdoor space counting bird species and counts.',
      projectId: 'proj-abc-02',
      published: true,
      publicAccess: true,
      status: 'Active',
      startDate: '2026-10-15T00:00:00Z',
    },
    {
      id: 'pa-kfri-01',
      projectActivityId: 'pa-kfri-01',
      name: 'KFRI Botanical Quadrat Survey',
      description: 'Detailed 10x10 meter quadrat survey recording canopy coverage, saplings, and ground cover.',
      projectId: 'proj-kfri-01',
      published: true,
      publicAccess: true,
      status: 'Active',
      startDate: '2026-01-01T00:00:00Z',
    },
    {
      id: 'pa-kfri-02',
      projectActivityId: 'pa-kfri-02',
      name: 'KFRI Insect Trap Log',
      description: 'Light trap and pitfall trap specimen records with high-resolution specimen photography.',
      projectId: 'proj-kfri-02',
      published: true,
      publicAccess: true,
      status: 'Active',
      startDate: '2026-03-01T00:00:00Z',
    },
  ];

  console.log(`[Seed] Seeding ${surveys.length} surveys...`);
  for (const survey of surveys) {
    await prisma.survey.upsert({
      where: { id: survey.id },
      update: survey,
      create: survey,
    });
  }

  // 5. Seed Activities
  const activities = [
    {
      activityId: 'act-001',
      projectActivityId: 'pa-gsb-01',
      type: 'BioBlitz Observation Form',
      status: 'active',
      lastUpdated: '2026-10-04T12:00:00Z',
      endDate: '2026-10-04T12:00:00Z',
      userId: 'mock-user-ecologist-001',
      name: 'BioBlitz Observation Form',
      projectName: 'Great Southern BioBlitz 2026',
      projectId: 'proj-gsb-01',
      activityOwnerName: 'Alex Citizen',
      records: [
        {
          guid: 'rec-001',
          name: 'Platycercus elegans',
          commonName: 'Crimson Rosella',
          multimedia: { imageId: 'img-001' },
        },
      ],
    },
    {
      activityId: 'act-002',
      projectActivityId: 'pa-gsb-01',
      type: 'BioBlitz Observation Form',
      status: 'active',
      lastUpdated: '2026-10-04T13:30:00Z',
      endDate: '2026-10-04T13:30:00Z',
      userId: 'mock-user-ecologist-001',
      name: 'BioBlitz Observation Form',
      projectName: 'Great Southern BioBlitz 2026',
      projectId: 'proj-gsb-01',
      activityOwnerName: 'Alex Citizen',
      records: [
        {
          guid: 'rec-002',
          name: 'Acacia pycnantha',
          commonName: 'Golden Wattle',
          multimedia: { imageId: 'img-002' },
        },
      ],
    },
    {
      activityId: 'act-003',
      projectActivityId: 'pa-abc-01',
      type: 'Aussie Bird Count Form',
      status: 'active',
      lastUpdated: '2026-10-04T14:15:00Z',
      endDate: '2026-10-04T14:15:00Z',
      userId: 'mock-user-ecologist-001',
      name: 'Aussie Bird Count Form',
      projectName: 'Aussie Backyard Bird Count',
      projectId: 'proj-abc-02',
      activityOwnerName: 'Alex Citizen',
      records: [
        {
          guid: 'rec-003',
          name: 'Gymnorhina tibicen',
          commonName: 'Australian Magpie',
          multimedia: { imageId: 'img-003' },
        },
      ],
    },
    {
      activityId: 'act-004',
      projectActivityId: 'pa-kfri-01',
      type: 'KFRI Botanical Quadrat Record',
      status: 'active',
      lastUpdated: '2026-10-04T15:00:00Z',
      endDate: '2026-10-04T15:00:00Z',
      userId: 'mock-user-ecologist-001',
      name: 'KFRI Botanical Quadrat Record',
      projectName: 'KFRI Western Ghats Flora Mapping',
      projectId: 'proj-kfri-01',
      activityOwnerName: 'Alex Citizen',
      records: [
        {
          guid: 'rec-004',
          name: 'Tectona grandis',
          commonName: 'Teak',
          multimedia: { imageId: 'img-004' },
        },
      ],
    },
    {
      activityId: 'act-005',
      projectActivityId: 'pa-kfri-02',
      type: 'Pest & Defoliation Incident Report',
      status: 'active',
      lastUpdated: '2026-10-04T16:00:00Z',
      endDate: '2026-10-04T16:00:00Z',
      userId: 'mock-user-ecologist-001',
      name: 'Pest & Defoliation Incident Report',
      projectName: 'KFRI Forest Insect Biodiversity Survey',
      projectId: 'proj-kfri-02',
      activityOwnerName: 'Alex Citizen',
      records: [
        {
          guid: 'rec-005',
          name: 'Hyblaea puera',
          commonName: 'Teak Defoliator Moth',
          multimedia: { imageId: 'img-005' },
        },
      ],
    },
  ];

  console.log(`[Seed] Seeding ${activities.length} bio activities...`);
  for (const act of activities) {
    await prisma.bioActivity.upsert({
      where: { activityId: act.activityId },
      update: act,
      create: act,
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
