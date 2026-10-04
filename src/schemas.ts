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
  description: z.string().optional().default(''),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional().default('Active'),
  published: z.boolean().optional().default(true),
  publicAccess: z.boolean().optional().default(true),
  projectId: z.string().optional(),
  projectActivityId: z.string().optional(),
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
  description: z.string().optional().default(''),
  startDate: z.string().optional(),
  urlImage: z.string().nullable().optional(),
  organisationName: z.string().optional().default(''),
  projectActivities: z.array(BioCollectSurveySchema).default([]),
  aim: z.string().optional(),
  difficulty: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isExternal: z.boolean().optional(),
  isSciStarter: z.boolean().optional(),
  isMERIT: z.boolean().optional(),
  projectType: z.string().optional(),
  organisationId: z.string().optional(),
  hub: z.string().optional(),
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
  imageId: z.string().optional(),
  documentId: z.string().optional(),
  identifier: z.string().optional(),
  title: z.string().optional(),
  rightsHolder: z.string().optional(),
  license: z.string().optional(),
  creator: z.string().optional(),
  format: z.string().optional(),
  type: z.string().optional(),
}).passthrough();

export const BioRecordSchema = z.object({
  guid: z.string().optional(),
  name: z.string().optional(),
  commonName: z.string().optional(),
  eventDate: z.string().optional(),
  eventTime: z.string().optional(),
  individualCount: z.number().optional(),
  coordinates: z.array(z.number()).optional(),
  multimedia: MultimediaRecordSchema.optional(),
}).passthrough();

export const BioCollectBioActivitySchema = z.object({
  activityId: z.string(),
  projectActivityId: z.string(),
  type: z.string(),
  status: z.string(),
  lastUpdated: z.string(),
  userId: z.string(),
  name: z.string(),
  projectName: z.string().optional().default(''),
  records: z.array(BioRecordSchema).optional().default([]),
  projectId: z.string().optional(),
  activityOwnerName: z.string().optional(),
  siteId: z.string().optional(),
  embargoed: z.boolean().optional(),
  embargoUntil: z.string().optional(),
  endDate: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  showCrud: z.boolean().optional(),
  userCanModerate: z.boolean().optional(),
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
});

export type ActivitySearchQuery = z.infer<typeof ActivitySearchQuerySchema>;

export const BioCollectBioActivitySearchResponseSchema = z.object({
  activities: z.array(BioCollectBioActivitySchema),
});

export type BioCollectBioActivitySearchResponse = z.infer<typeof BioCollectBioActivitySearchResponseSchema>;
