/*
  Warnings:

  - Added the required column `seed` to the `RoguelikeRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `RoguelikeRun` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RoguelikeRun" ADD COLUMN     "seed" TEXT NOT NULL,
ADD COLUMN     "state" JSONB NOT NULL;
