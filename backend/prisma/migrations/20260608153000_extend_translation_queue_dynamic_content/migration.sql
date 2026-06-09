-- AlterEnum
ALTER TYPE "TranslationEntityType" ADD VALUE 'EXTRA_SERVICE';
ALTER TYPE "TranslationEntityType" ADD VALUE 'PRODUCT_FEATURE';
ALTER TYPE "TranslationEntityType" ADD VALUE 'PACKAGE_COMPONENT';

-- AlterTable
ALTER TABLE "ExtraService"
ADD COLUMN "translationStatus" "TranslationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN "translationError" TEXT,
ADD COLUMN "translationRequestedAt" TIMESTAMP(3),
ADD COLUMN "translationCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProductFeature"
ADD COLUMN "translationStatus" "TranslationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN "translationError" TEXT,
ADD COLUMN "translationRequestedAt" TIMESTAMP(3),
ADD COLUMN "translationCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PackageComponent"
ADD COLUMN "translationStatus" "TranslationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN "translationError" TEXT,
ADD COLUMN "translationRequestedAt" TIMESTAMP(3),
ADD COLUMN "translationCompletedAt" TIMESTAMP(3);
