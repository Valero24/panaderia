CREATE TYPE "MediaOwnerType" AS ENUM ('PROPERTY', 'EXPERIENCE', 'PACKAGE', 'DESTINATION', 'BLOG');
CREATE TYPE "MediaProvider" AS ENUM ('DIRECT', 'YOUTUBE', 'VIMEO', 'EXTERNAL');

CREATE TABLE "ContentMedia" (
  "id" SERIAL NOT NULL,
  "ownerType" "MediaOwnerType" NOT NULL,
  "ownerId" INTEGER NOT NULL,
  "type" "MediaType" NOT NULL DEFAULT 'IMAGE',
  "url" TEXT NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "isMain" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "provider" "MediaProvider" NOT NULL DEFAULT 'EXTERNAL',
  "thumbnailUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContentMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContentMedia_ownerType_ownerId_idx" ON "ContentMedia"("ownerType", "ownerId");
CREATE INDEX "ContentMedia_ownerType_ownerId_isActive_idx" ON "ContentMedia"("ownerType", "ownerId", "isActive");
CREATE INDEX "ContentMedia_ownerType_ownerId_isMain_idx" ON "ContentMedia"("ownerType", "ownerId", "isMain");
