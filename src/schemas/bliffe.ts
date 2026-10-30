import { z } from 'zod';

// ==========================================
// 1. Primitive & Enum Types matching B-Liffe contracts
// ==========================================

export const IdentificationStatusSchema = z.enum([
  'Identified',
  'Unknown',
  'Needs verification',
]);
export type IdentificationStatus = z.infer<typeof IdentificationStatusSchema>;

export const OrganismStatusSchema = z.enum([
  'Wild',
  'Captive',
  'Cultivated',
  'Unknown / Not sure',
]);
export type OrganismStatus = z.infer<typeof OrganismStatusSchema>;

export const LocationVisibilitySchema = z.enum(['Open', 'Obscured', 'Private']);
export type LocationVisibility = z.infer<typeof LocationVisibilitySchema>;

export const SyncStatusSchema = z.enum(['draft', 'pending', 'synced']);
export type SyncStatus = z.infer<typeof SyncStatusSchema>;

export const LocationSourceSchema = z.enum(['GPS', 'Manual Pin Adjustment']);
export type LocationSource = z.infer<typeof LocationSourceSchema>;

export const BasisOfRecordSchema = z.enum([
  'HumanObservation',
  'MachineObservation',
  'PreservedSpecimen',
  'MaterialSample',
  'LivingSpecimen',
  'FossilSpecimen',
  'Literature',
  'Unknown',
]);
export type BasisOfRecord = z.infer<typeof BasisOfRecordSchema>;

export const VerificationStatusSchema = z.enum(['Unreviewed', 'Validated', 'Flagged']);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const YesNoSchema = z.enum(['Yes', 'No']);
export type YesNo = z.infer<typeof YesNoSchema>;

export const AvatarPresetIdSchema = z.enum([
  'user',
  'bird',
  'frog',
  'elephant',
  'turtle',
  'squirrel',
  'butterfly',
  'leaf',
]);
export type AvatarPresetId = z.infer<typeof AvatarPresetIdSchema>;

export const AvatarTypeSchema = z.enum(['preset', 'upload']);
export type AvatarType = z.infer<typeof AvatarTypeSchema>;

// ==========================================
// 2. User & Profile Schemas (src/lib/profileTypes.ts)
// ==========================================

export const UserProfileSchema = z.object({
  id: z.string(),
  fullName: z.string().min(1),
  name: z.string().optional(),
  displayName: z.string(),
  email: z.string().email(),
  bio: z.string().default(''),
  avatarType: AvatarTypeSchema.default('preset'),
  avatarPresetId: AvatarPresetIdSchema.default('user'),
  avatarCustomUrl: z.string().nullable().optional(),
  updatedAt: z.string(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const ProfileUpdateInputSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  displayName: z.string().optional(),
  bio: z.string().optional().default(''),
  avatarType: AvatarTypeSchema.default('preset'),
  avatarPresetId: AvatarPresetIdSchema.default('user'),
  avatarCustomUrl: z.string().nullable().optional(),
});
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateInputSchema>;

// ==========================================
// 3. Project Entity Schemas (src/db/database.ts)
// ==========================================

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().nullable().optional().default(''),
  startDate: z.string().nullable().optional(),
  status: z.enum(['active', 'completed', 'archived']).default('active'),
  organization: z.string().nullable().optional().default(''),
  targetRegion: z.string().nullable().optional().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
  syncStatus: SyncStatusSchema.default('synced'),
  observationCount: z.number().optional(),
  wardCount: z.number().optional(),
  surveyCount: z.number().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().nullable().optional().default(''),
  startDate: z.string().nullable().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional().default('active'),
  organization: z.string().nullable().optional().default(''),
  targetRegion: z.string().nullable().optional().default(''),
  syncStatus: SyncStatusSchema.optional().default('synced'),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  organization: z.string().nullable().optional(),
  targetRegion: z.string().nullable().optional(),
  syncStatus: SyncStatusSchema.optional(),
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

// ==========================================
// 4. Ward Entity & GIS Schemas (src/db/database.ts & src/lib/wardService.ts)
// ==========================================

export const WardSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  wardNumber: z.string(),
  wardName: z.string(),
  localBodyName: z.string().nullable().optional().default(''),
  district: z.string().nullable().optional().default(''),
  state: z.string().nullable().optional().default(''),
  keyLandmarks: z.string().nullable().optional().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
  syncStatus: SyncStatusSchema.default('synced'),
});
export type Ward = z.infer<typeof WardSchema>;

export const CreateWardSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1, 'Project ID is required'),
  wardNumber: z.string().min(1, 'Ward number is required'),
  wardName: z.string().min(1, 'Ward name is required'),
  localBodyName: z.string().nullable().optional().default(''),
  district: z.string().nullable().optional().default(''),
  state: z.string().nullable().optional().default(''),
  keyLandmarks: z.string().nullable().optional().default(''),
  syncStatus: SyncStatusSchema.optional().default('synced'),
});
export type CreateWardInput = z.infer<typeof CreateWardSchema>;

export const UpdateWardSchema = z.object({
  wardNumber: z.string().optional(),
  wardName: z.string().optional(),
  localBodyName: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  keyLandmarks: z.string().nullable().optional(),
  syncStatus: SyncStatusSchema.optional(),
});
export type UpdateWardInput = z.infer<typeof UpdateWardSchema>;

export const IdentifiedWardSchema = z.object({
  wardId: z.string(),
  wardNumber: z.string(),
  wardName: z.string(),
  localBodyName: z.string().optional(),
});
export type IdentifiedWard = z.infer<typeof IdentifiedWardSchema>;

export const WardIdentificationResultSchema = z.object({
  status: z.enum([
    'location_not_obtained',
    'requesting_location',
    'location_obtained',
    'identifying_ward',
    'ward_identified',
    'ward_unidentified',
    'location_unavailable',
  ]),
  ward: IdentifiedWardSchema.optional(),
  message: z.string(),
});
export type WardIdentificationResult = z.infer<typeof WardIdentificationResultSchema>;

export const WardIdentifyRequestSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});
export type WardIdentifyRequest = z.infer<typeof WardIdentifyRequestSchema>;

// ==========================================
// 5. Survey Entity Schemas (src/db/database.ts)
// ==========================================

export const SurveySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  wardId: z.string(),
  leadObserver: z.string(),
  teamMembers: z.array(z.string()).optional().default([]),
  surveyMethod: z.string().nullable().optional().default('Opportunistic Encounter'),
  habitatType: z.string().nullable().optional().default('Urban Park / Garden'),
  targetGroup: z.string().nullable().optional().default('All Biodiversity'),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  weatherNotes: z.string().nullable().optional().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
  syncStatus: SyncStatusSchema.default('synced'),
  observationCount: z.number().optional(),
});
export type Survey = z.infer<typeof SurveySchema>;

export const CreateSurveySchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1, 'Project ID is required'),
  wardId: z.string().min(1, 'Ward ID is required'),
  leadObserver: z.string().min(1, 'Lead observer is required'),
  teamMembers: z.array(z.string()).optional().default([]),
  surveyMethod: z.string().nullable().optional().default('Opportunistic Encounter'),
  habitatType: z.string().nullable().optional().default('Urban Park / Garden'),
  targetGroup: z.string().nullable().optional().default('All Biodiversity'),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  weatherNotes: z.string().nullable().optional().default(''),
  syncStatus: SyncStatusSchema.optional().default('synced'),
});
export type CreateSurveyInput = z.infer<typeof CreateSurveySchema>;

export const UpdateSurveySchema = z.object({
  leadObserver: z.string().optional(),
  teamMembers: z.array(z.string()).optional(),
  surveyMethod: z.string().nullable().optional(),
  habitatType: z.string().nullable().optional(),
  targetGroup: z.string().nullable().optional(),
  startTime: z.string().optional(),
  endTime: z.string().nullable().optional(),
  weatherNotes: z.string().nullable().optional(),
  syncStatus: SyncStatusSchema.optional(),
});
export type UpdateSurveyInput = z.infer<typeof UpdateSurveySchema>;

// ==========================================
// 6. Observation Entity Schemas (src/db/database.ts)
// ==========================================

export const ObservationSchema = z.object({
  id: z.string(),
  surveyId: z.string().nullable().optional(),
  wardId: z.string().nullable().optional(),
  wardName: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  projectIds: z.array(z.string()).optional().default([]),

  speciesName: z.string().min(1, 'Species name is required'),
  scientificName: z.string().nullable().optional().default(''),
  localName: z.string().nullable().optional().default(''),
  speciesGroup: z.string().nullable().optional().default(''),
  speciesGroups: z.string().nullable().optional().default(''),
  otherSpeciesGroup: z.string().nullable().optional().default(''),
  identificationStatus: IdentificationStatusSchema.optional().default('Identified'),
  organismStatus: OrganismStatusSchema.optional().default('Wild'),
  locationVisibility: LocationVisibilitySchema.optional().default('Open'),
  basis_of_record: BasisOfRecordSchema.default('HumanObservation'),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().default(''),

  individualCount: z.number().int().positive().optional().default(1),
  lifeStage: z.string().nullable().optional().default(''),
  microHabitat: z.string().nullable().optional().default(''),
  otherMicroHabitat: z.string().nullable().optional().default(''),

  hasTraditionalKnowledge: YesNoSchema.optional().default('No'),
  traditionalKnowledgeSource: z.string().nullable().optional().default(''),
  otherTraditionalKnowledgeSource: z.string().nullable().optional().default(''),

  gps_latitude: z.number().nullable().optional(),
  gps_longitude: z.number().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  location_source: LocationSourceSchema.nullable().optional().default('GPS'),
  accuracyMeters: z.number().nullable().optional(),

  observationAt: z.string(),
  recordedAt: z.string(),

  photos: z.array(z.string()).optional().default([]),
  photo: z.string().nullable().optional(),

  verificationStatus: VerificationStatusSchema.optional().default('Unreviewed'),
  verifiedBy: z.string().nullable().optional().default(''),
  verificationNotes: z.string().nullable().optional().default(''),

  syncStatus: SyncStatusSchema.optional().default('synced'),
  userId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Observation = z.infer<typeof ObservationSchema>;

export const CreateObservationSchema = ObservationSchema.extend({
  id: z.string().optional(),
});
export type CreateObservationInput = z.infer<typeof CreateObservationSchema>;

export const UpdateObservationSchema = z.object({
  surveyId: z.string().nullable().optional(),
  wardId: z.string().nullable().optional(),
  wardName: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  projectIds: z.array(z.string()).optional(),
  speciesName: z.string().min(1).optional(),
  scientificName: z.string().nullable().optional(),
  localName: z.string().nullable().optional(),
  speciesGroup: z.string().nullable().optional(),
  speciesGroups: z.string().nullable().optional(),
  otherSpeciesGroup: z.string().nullable().optional(),
  identificationStatus: IdentificationStatusSchema.optional(),
  organismStatus: OrganismStatusSchema.optional(),
  locationVisibility: LocationVisibilitySchema.optional(),
  basis_of_record: BasisOfRecordSchema.optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  individualCount: z.number().int().positive().optional(),
  lifeStage: z.string().nullable().optional(),
  microHabitat: z.string().nullable().optional(),
  otherMicroHabitat: z.string().nullable().optional(),
  hasTraditionalKnowledge: YesNoSchema.optional(),
  traditionalKnowledgeSource: z.string().nullable().optional(),
  otherTraditionalKnowledgeSource: z.string().nullable().optional(),
  gps_latitude: z.number().nullable().optional(),
  gps_longitude: z.number().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  location_source: LocationSourceSchema.nullable().optional(),
  accuracyMeters: z.number().nullable().optional(),
  observationAt: z.string().optional(),
  recordedAt: z.string().optional(),
  photos: z.array(z.string()).optional(),
  photo: z.string().nullable().optional(),
  verificationStatus: VerificationStatusSchema.optional(),
  verifiedBy: z.string().nullable().optional(),
  verificationNotes: z.string().nullable().optional(),
  syncStatus: SyncStatusSchema.optional(),
});
export type UpdateObservationInput = z.infer<typeof UpdateObservationSchema>;

export const ObservationQuerySchema = z.object({
  projectId: z.string().optional(),
  wardId: z.string().optional(),
  surveyId: z.string().optional(),
  identificationStatus: z.string().optional(),
  organismStatus: z.string().optional(),
  tag: z.string().optional(),
  q: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
});
export type ObservationQuery = z.infer<typeof ObservationQuerySchema>;

// ==========================================
// 7. Auth Schemas (src/pages/LoginPage.tsx & CreateAccountPage.tsx)
// ==========================================

export const RegisterInputSchema = z.object({
  fullName: z.string().min(2, 'Full name is required (minimum 2 characters)'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const AuthResponseSchema = z.object({
  user: UserProfileSchema,
  token: z.string(),
  message: z.string().optional(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// ==========================================
// 8. Offline Sync Schemas (src/pages/OfflineSyncPage.tsx)
// ==========================================

export const SyncPayloadSchema = z.object({
  projects: z.array(CreateProjectSchema).optional().default([]),
  wards: z.array(CreateWardSchema).optional().default([]),
  surveys: z.array(CreateSurveySchema).optional().default([]),
  observations: z.array(CreateObservationSchema).optional().default([]),
});
export type SyncPayload = z.infer<typeof SyncPayloadSchema>;

export const SyncResponseSchema = z.object({
  success: z.boolean(),
  timestamp: z.string(),
  synced: z.object({
    projects: z.number(),
    wards: z.number(),
    surveys: z.number(),
    observations: z.number(),
  }),
});
export type SyncResponse = z.infer<typeof SyncResponseSchema>;

export const SyncStatusResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  counts: z.object({
    projects: z.number(),
    wards: z.number(),
    surveys: z.number(),
    observations: z.number(),
  }),
});
export type SyncStatusResponse = z.infer<typeof SyncStatusResponseSchema>;
