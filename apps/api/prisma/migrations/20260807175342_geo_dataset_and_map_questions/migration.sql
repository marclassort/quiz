-- CreateEnum
CREATE TYPE "game_mode" AS ENUM ('CLASSIC', 'GEO');

-- CreateEnum
CREATE TYPE "geo_dataset_kind" AS ENUM ('COUNTRY', 'CAPITAL', 'CITY', 'RIVER', 'LAKE', 'ADMIN_FR', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "question_type" ADD VALUE 'MAP_CLICK';
ALTER TYPE "question_type" ADD VALUE 'MAP_PLACE';

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "payload" JSONB;

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "config" JSONB,
ADD COLUMN     "game_mode" "game_mode" NOT NULL DEFAULT 'CLASSIC';

-- CreateTable
CREATE TABLE "geo_datasets" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "geo_dataset_kind" NOT NULL,
    "scope" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "attribution_text" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geo_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "geo_datasets_slug_key" ON "geo_datasets"("slug");
