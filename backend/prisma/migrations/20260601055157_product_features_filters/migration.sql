-- CreateEnum
CREATE TYPE "ProductFeatureAppliesTo" AS ENUM ('PROPERTY', 'EXPERIENCE', 'PACKAGE', 'ALL');

-- CreateEnum
CREATE TYPE "ProductFeatureCategory" AS ENUM ('AMENITY', 'LOCATION_STYLE', 'EXPERIENCE_STYLE', 'TRAVEL_TYPE', 'SERVICE_LEVEL', 'INCLUDED', 'NOT_INCLUDED', 'CONDITION', 'OTHER');

-- CreateTable
CREATE TABLE "ProductFeature" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "category" "ProductFeatureCategory" NOT NULL DEFAULT 'OTHER',
    "appliesTo" "ProductFeatureAppliesTo" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFeatureAssignment" (
    "id" SERIAL NOT NULL,
    "featureId" INTEGER NOT NULL,
    "productType" "BookingType" NOT NULL,
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductFeatureAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductFeature_slug_key" ON "ProductFeature"("slug");

-- CreateIndex
CREATE INDEX "ProductFeature_active_idx" ON "ProductFeature"("active");

-- CreateIndex
CREATE INDEX "ProductFeature_appliesTo_idx" ON "ProductFeature"("appliesTo");

-- CreateIndex
CREATE INDEX "ProductFeature_category_idx" ON "ProductFeature"("category");

-- CreateIndex
CREATE INDEX "ProductFeatureAssignment_productType_productId_idx" ON "ProductFeatureAssignment"("productType", "productId");

-- CreateIndex
CREATE INDEX "ProductFeatureAssignment_featureId_idx" ON "ProductFeatureAssignment"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFeatureAssignment_featureId_productType_productId_key" ON "ProductFeatureAssignment"("featureId", "productType", "productId");

-- AddForeignKey
ALTER TABLE "ProductFeatureAssignment" ADD CONSTRAINT "ProductFeatureAssignment_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "ProductFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
