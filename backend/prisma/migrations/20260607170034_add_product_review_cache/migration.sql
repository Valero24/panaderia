-- Add cached review aggregates to public product models.
ALTER TABLE "Property"
ADD COLUMN "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ratingDistribution" JSONB;

ALTER TABLE "Experience"
ADD COLUMN "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ratingDistribution" JSONB;

ALTER TABLE "Package"
ADD COLUMN "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ratingDistribution" JSONB;

-- Backfill existing approved reviews so product detail pages can read cache immediately.
UPDATE "Property" p
SET
  "averageRating" = sub."averageRating",
  "reviewCount" = sub."reviewCount",
  "ratingDistribution" = sub."ratingDistribution"
FROM (
  SELECT
    "targetId",
    ROUND(AVG("rating")::numeric, 2)::numeric(3,2) AS "averageRating",
    COUNT(*)::int AS "reviewCount",
    jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE "rating" = 5),
      '4', COUNT(*) FILTER (WHERE "rating" = 4),
      '3', COUNT(*) FILTER (WHERE "rating" = 3),
      '2', COUNT(*) FILTER (WHERE "rating" = 2),
      '1', COUNT(*) FILTER (WHERE "rating" = 1)
    ) AS "ratingDistribution"
  FROM "Review"
  WHERE "status" = 'APPROVED' AND "targetType" = 'PROPERTY'
  GROUP BY "targetId"
) sub
WHERE p."id" = sub."targetId";

UPDATE "Experience" e
SET
  "averageRating" = sub."averageRating",
  "reviewCount" = sub."reviewCount",
  "ratingDistribution" = sub."ratingDistribution"
FROM (
  SELECT
    "targetId",
    ROUND(AVG("rating")::numeric, 2)::numeric(3,2) AS "averageRating",
    COUNT(*)::int AS "reviewCount",
    jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE "rating" = 5),
      '4', COUNT(*) FILTER (WHERE "rating" = 4),
      '3', COUNT(*) FILTER (WHERE "rating" = 3),
      '2', COUNT(*) FILTER (WHERE "rating" = 2),
      '1', COUNT(*) FILTER (WHERE "rating" = 1)
    ) AS "ratingDistribution"
  FROM "Review"
  WHERE "status" = 'APPROVED' AND "targetType" = 'EXPERIENCE'
  GROUP BY "targetId"
) sub
WHERE e."id" = sub."targetId";

UPDATE "Package" p
SET
  "averageRating" = sub."averageRating",
  "reviewCount" = sub."reviewCount",
  "ratingDistribution" = sub."ratingDistribution"
FROM (
  SELECT
    "targetId",
    ROUND(AVG("rating")::numeric, 2)::numeric(3,2) AS "averageRating",
    COUNT(*)::int AS "reviewCount",
    jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE "rating" = 5),
      '4', COUNT(*) FILTER (WHERE "rating" = 4),
      '3', COUNT(*) FILTER (WHERE "rating" = 3),
      '2', COUNT(*) FILTER (WHERE "rating" = 2),
      '1', COUNT(*) FILTER (WHERE "rating" = 1)
    ) AS "ratingDistribution"
  FROM "Review"
  WHERE "status" = 'APPROVED' AND "targetType" = 'PACKAGE'
  GROUP BY "targetId"
) sub
WHERE p."id" = sub."targetId";
