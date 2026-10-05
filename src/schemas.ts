import { z } from 'zod';

// ==========================================
// 1. Hub Schemas
// ==========================================
export const BioCollectHubSchema = z.object({
  id: z.string(),
  url: z.string(),
  name: z.string(),
  description: z.string(),
  logo: z.string(),
});

export type BioCollectHub = z.infer<typeof BioCollectHubSchema>;

// ==========================================
// 2. Survey Schemas
// ==========================================
export const BioCollectSurveySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional().default(''),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.string().nullable().optional().default('Active'),
  published: z.boolean().nullable().optional().default(true),
  publicAccess: z.boolean().nullable().optional().default(true),
  projectId: z.string().nullable().optional(),
  projectActivityId: z.string().nullable().optional(),
}).passthrough();

export type BioCollectSurvey = z.infer<typeof BioCollectSurveySchema>;

// ==========================================
// 3. Project Schemas
// ==========================================
export const FacetSchema = z.object({
  entries: z.array(z.string()).default([]),
  name: z.string(),
  title: z.string(),
  total: z.number().default(0),
});

export type Facet = z.infer<typeof FacetSchema>;

export const BioCollectProjectSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional().default(''),
  startDate: z.string().nullable().optional(),
  urlImage: z.string().nullable().optional(),
  fullSizeImageUrl: z.string().nullable().optional(),
  urlWeb: z.string().nullable().optional(),
  projectLogoImage: z.string().nullable().optional(),
  projectLogoImageCredit: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactDetails: z.string().nullable().optional(),
  projectTask: z.string().nullable().optional(),
  projectEquipment: z.string().nullable().optional(),
  projectHowToParticipate: z.string().nullable().optional(),
  organisationName: z.string().nullable().optional().default(''),
  projectActivities: z.array(BioCollectSurveySchema).default([]),
  aim: z.string().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  plannedStartDate: z.string().nullable().optional(),
  plannedEndDate: z.string().nullable().optional(),
  isExternal: z.boolean().nullable().optional(),
  isSciStarter: z.boolean().nullable().optional(),
  isMERIT: z.boolean().nullable().optional(),
  projectType: z.string().nullable().optional(),
  organisationId: z.string().nullable().optional(),
  hub: z.string().nullable().optional(),
  keywords: z.array(z.string()).nullable().optional().default([]),
  tags: z.array(z.string()).nullable().optional().default([]),
  links: z.array(z.any()).nullable().optional().default([]),
  scienceType: z.array(z.string()).nullable().optional().default([]),
  ecoScienceType: z.array(z.string()).nullable().optional().default([]),
}).passthrough();

export type BioCollectProject = z.infer<typeof BioCollectProjectSchema>;

export const ProjectSearchQuerySchema = z.object({
  // fq is required by the API contract. Express parses multiple fq params as array or single as string.
  fq: z.union([z.string(), z.array(z.string())], {
    message: "Query parameter 'fq' is required (e.g. 'isExternal:F')",
  }),
  initiator: z.string().optional(),
  sort: z.string().optional(),
  mobile: z.union([z.string(), z.boolean()]).optional(),
  max: z.coerce.number().optional().default(30),
  offset: z.coerce.number().optional().default(0),
  isUserPage: z.union([z.string(), z.boolean()]).optional(),
  hub: z.string().optional(),
  q: z.string().optional(),
  queryText: z.string().optional(),
});

export type ProjectSearchQuery = z.infer<typeof ProjectSearchQuerySchema>;

export const ProjectSearchResponseSchema = z.object({
  facets: z.array(FacetSchema),
  total: z.number(),
  projects: z.array(BioCollectProjectSchema),
});

export type ProjectSearchResponse = z.infer<typeof ProjectSearchResponseSchema>;

// ==========================================
// 4. BioActivity Schemas
// ==========================================
export const MultimediaRecordSchema = z.object({
  imageId: z.string().nullable().optional(),
  documentId: z.string().nullable().optional(),
  identifier: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  rightsHolder: z.string().nullable().optional(),
  license: z.string().nullable().optional(),
  creator: z.string().nullable().optional(),
  format: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
}).passthrough();

export const BioRecordSchema = z.object({
  guid: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  commonName: z.string().nullable().optional(),
  eventDate: z.string().nullable().optional(),
  eventTime: z.string().nullable().optional(),
  individualCount: z.number().nullable().optional(),
  coordinates: z.array(z.number()).nullable().optional(),
  multimedia: MultimediaRecordSchema.nullable().optional(),
}).passthrough();

export const BioCollectBioActivitySchema = z.object({
  activityId: z.string(),
  projectActivityId: z.string(),
  type: z.string(),
  status: z.string(),
  lastUpdated: z.string(),
  userId: z.string(),
  name: z.string(),
  projectName: z.string().nullable().optional().default(''),
  records: z.any().optional().default([]),
  projectId: z.string().nullable().optional(),
  activityOwnerName: z.string().nullable().optional(),
  siteId: z.string().nullable().optional(),
  embargoed: z.boolean().nullable().optional().default(false),
  embargoUntil: z.string().nullable().optional().default(''),
  endDate: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  showCrud: z.boolean().nullable().optional().default(true),
  userCanModerate: z.boolean().nullable().optional().default(true),
}).passthrough();

export type BioCollectBioActivity = z.infer<typeof BioCollectBioActivitySchema>;

export const ActivitySearchQuerySchema = z.object({
  // view is required: 'myrecords', 'project', 'allrecords'
  view: z.enum(['myrecords', 'project', 'allrecords'] as const, {
    message: "Query parameter 'view' is required and must be 'myrecords', 'project', or 'allrecords'",
  }),
  projectId: z.string().optional(),
  searchTerm: z.string().optional(),
  offset: z.coerce.number().optional().default(0),
  max: z.coerce.number().optional().default(20),
  userId: z.string().optional(),
  fq: z.union([z.string(), z.array(z.string())]).optional(),
}).passthrough();

export type ActivitySearchQuery = z.infer<typeof ActivitySearchQuerySchema>;

export const BioCollectBioActivitySearchResponseSchema = z.object({
  activities: z.array(BioCollectBioActivitySchema),
});

export type BioCollectBioActivitySearchResponse = z.infer<typeof BioCollectBioActivitySearchResponseSchema>;

// ==========================================
// 5. Entity Mutation (Create / Update) Schemas
// ==========================================
export const CreateHubSchema = BioCollectHubSchema;
export const UpdateHubSchema = BioCollectHubSchema.partial();

export const CreateProjectSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  name: z.string().min(1, 'name is required'),
  description: z.string().optional().default(''),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  urlImage: z.string().optional(),
  fullSizeImageUrl: z.string().optional(),
  urlWeb: z.string().optional(),
  projectLogoImage: z.string().optional(),
  projectLogoImageCredit: z.string().optional(),
  contactName: z.string().optional(),
  contactDetails: z.string().optional(),
  projectTask: z.string().optional(),
  projectEquipment: z.string().optional(),
  projectHowToParticipate: z.string().optional(),
  organisationName: z.string().optional().default(''),
  organisationId: z.string().optional(),
  aim: z.string().optional(),
  difficulty: z.string().optional(),
  isExternal: z.boolean().optional().default(false),
  isSciStarter: z.boolean().optional().default(false),
  isMERIT: z.boolean().optional().default(false),
  projectType: z.string().optional(),
  hub: z.string().optional(),
  keywords: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  scienceType: z.array(z.string()).optional().default([]),
  ecoScienceType: z.array(z.string()).optional().default([]),
  rawData: z.any().optional(),
});
export const UpdateProjectSchema = CreateProjectSchema.partial();

export const CreateSurveySchema = z.object({
  id: z.string().min(1, 'id is required'),
  name: z.string().min(1, 'name is required'),
  projectActivityId: z.string().optional(),
  description: z.string().optional().default(''),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional().default('Active'),
  published: z.boolean().optional().default(true),
  publicAccess: z.boolean().optional().default(true),
  projectId: z.string().optional(),
  rawData: z.any().optional(),
});
export const UpdateSurveySchema = CreateSurveySchema.partial();

export const CreateBioActivitySchema = z.object({
  activityId: z.string().min(1, 'activityId is required'),
  projectActivityId: z.string().min(1, 'projectActivityId is required'),
  type: z.string().min(1, 'type is required'),
  status: z.string().min(1, 'status is required'),
  lastUpdated: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().min(1, 'userId is required'),
  name: z.string().min(1, 'name is required'),
  projectName: z.string().optional().default(''),
  projectId: z.string().optional(),
  activityOwnerName: z.string().optional(),
  siteId: z.string().optional(),
  embargoed: z.boolean().optional().default(false),
  embargoUntil: z.string().optional().default(''),
  projectType: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  showCrud: z.boolean().optional().default(true),
  userCanModerate: z.boolean().optional().default(true),
  records: z.any().optional().default([]),
  rawData: z.any().optional(),
});
export const UpdateBioActivitySchema = CreateBioActivitySchema.partial();

