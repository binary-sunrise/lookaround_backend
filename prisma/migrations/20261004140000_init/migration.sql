-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "hubs" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "startDate" TEXT,
    "endDate" TEXT,
    "plannedStartDate" TEXT,
    "plannedEndDate" TEXT,
    "urlImage" TEXT,
    "fullSizeImageUrl" TEXT,
    "urlWeb" TEXT,
    "projectLogoImage" TEXT,
    "projectLogoImageCredit" TEXT,
    "contactName" TEXT,
    "contactDetails" TEXT,
    "projectTask" TEXT,
    "projectEquipment" TEXT,
    "projectHowToParticipate" TEXT,
    "organisationName" TEXT DEFAULT '',
    "organisationId" TEXT,
    "aim" TEXT,
    "difficulty" TEXT,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "isSciStarter" BOOLEAN NOT NULL DEFAULT false,
    "isMERIT" BOOLEAN NOT NULL DEFAULT false,
    "projectType" TEXT,
    "hub" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scienceType" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ecoScienceType" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "projectActivityId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "startDate" TEXT,
    "endDate" TEXT,
    "status" TEXT DEFAULT 'Active',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "publicAccess" BOOLEAN NOT NULL DEFAULT true,
    "projectId" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bio_activities" (
    "activityId" TEXT NOT NULL,
    "projectActivityId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastUpdated" TEXT NOT NULL,
    "endDate" TEXT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectName" TEXT DEFAULT '',
    "projectId" TEXT,
    "activityOwnerName" TEXT,
    "siteId" TEXT,
    "embargoed" BOOLEAN NOT NULL DEFAULT false,
    "embargoUntil" TEXT DEFAULT '',
    "projectType" TEXT,
    "thumbnailUrl" TEXT,
    "showCrud" BOOLEAN NOT NULL DEFAULT true,
    "userCanModerate" BOOLEAN NOT NULL DEFAULT true,
    "records" JSONB DEFAULT '[]',
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bio_activities_pkey" PRIMARY KEY ("activityId")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "sub" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "givenName" TEXT,
    "familyName" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT true,
    "role" TEXT,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customUserId" TEXT,
    "avatar" TEXT,
    "organisation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "surveys_projectId_idx" ON "surveys"("projectId");

-- CreateIndex
CREATE INDEX "bio_activities_userId_idx" ON "bio_activities"("userId");

-- CreateIndex
CREATE INDEX "bio_activities_projectId_idx" ON "bio_activities"("projectId");

-- CreateIndex
CREATE INDEX "bio_activities_projectActivityId_idx" ON "bio_activities"("projectActivityId");

-- CreateIndex
CREATE UNIQUE INDEX "users_sub_key" ON "users"("sub");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bio_activities" ADD CONSTRAINT "bio_activities_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("projectId") ON DELETE SET NULL ON UPDATE CASCADE;
