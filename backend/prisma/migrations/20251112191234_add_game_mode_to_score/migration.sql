-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('CLASSIQUE', 'SPRINT');

-- AlterTable
ALTER TABLE "Score" ADD COLUMN     "mode" "GameMode" NOT NULL DEFAULT 'CLASSIQUE';
