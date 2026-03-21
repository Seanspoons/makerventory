CREATE TYPE "ImportRowResolution" AS ENUM ('CREATE_NEW', 'UPDATE_MATCH', 'SKIP');

ALTER TABLE "ImportJob"
ADD COLUMN "fieldMapping" JSONB;

ALTER TABLE "ImportRow"
ADD COLUMN "resolution" "ImportRowResolution" NOT NULL DEFAULT 'CREATE_NEW',
ADD COLUMN "resolvedMatchId" TEXT,
ADD COLUMN "resolvedMatchSlug" TEXT;

UPDATE "ImportRow"
SET
  "resolution" = CASE
    WHEN "status" = 'SKIPPED' THEN 'SKIP'::"ImportRowResolution"
    WHEN "suggestedMatchId" IS NOT NULL THEN 'UPDATE_MATCH'::"ImportRowResolution"
    ELSE 'CREATE_NEW'::"ImportRowResolution"
  END,
  "resolvedMatchId" = "suggestedMatchId",
  "resolvedMatchSlug" = "suggestedMatchSlug";
