-- CreateTable
CREATE TABLE "DestinationProperty" (
    "id" SERIAL NOT NULL,
    "destinationId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinationProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationExperience" (
    "id" SERIAL NOT NULL,
    "destinationId" INTEGER NOT NULL,
    "experienceId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinationExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationPackage" (
    "id" SERIAL NOT NULL,
    "destinationId" INTEGER NOT NULL,
    "packageId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinationPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DestinationProperty_destinationId_propertyId_key" ON "DestinationProperty"("destinationId", "propertyId");

-- CreateIndex
CREATE INDEX "DestinationProperty_destinationId_idx" ON "DestinationProperty"("destinationId");

-- CreateIndex
CREATE INDEX "DestinationProperty_propertyId_idx" ON "DestinationProperty"("propertyId");

-- CreateIndex
CREATE INDEX "DestinationProperty_isFeatured_idx" ON "DestinationProperty"("isFeatured");

-- CreateIndex
CREATE INDEX "DestinationProperty_sortOrder_idx" ON "DestinationProperty"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationExperience_destinationId_experienceId_key" ON "DestinationExperience"("destinationId", "experienceId");

-- CreateIndex
CREATE INDEX "DestinationExperience_destinationId_idx" ON "DestinationExperience"("destinationId");

-- CreateIndex
CREATE INDEX "DestinationExperience_experienceId_idx" ON "DestinationExperience"("experienceId");

-- CreateIndex
CREATE INDEX "DestinationExperience_isFeatured_idx" ON "DestinationExperience"("isFeatured");

-- CreateIndex
CREATE INDEX "DestinationExperience_sortOrder_idx" ON "DestinationExperience"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationPackage_destinationId_packageId_key" ON "DestinationPackage"("destinationId", "packageId");

-- CreateIndex
CREATE INDEX "DestinationPackage_destinationId_idx" ON "DestinationPackage"("destinationId");

-- CreateIndex
CREATE INDEX "DestinationPackage_packageId_idx" ON "DestinationPackage"("packageId");

-- CreateIndex
CREATE INDEX "DestinationPackage_isFeatured_idx" ON "DestinationPackage"("isFeatured");

-- CreateIndex
CREATE INDEX "DestinationPackage_sortOrder_idx" ON "DestinationPackage"("sortOrder");

-- AddForeignKey
ALTER TABLE "DestinationProperty" ADD CONSTRAINT "DestinationProperty_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationProperty" ADD CONSTRAINT "DestinationProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationExperience" ADD CONSTRAINT "DestinationExperience_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationExperience" ADD CONSTRAINT "DestinationExperience_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationPackage" ADD CONSTRAINT "DestinationPackage_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationPackage" ADD CONSTRAINT "DestinationPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
