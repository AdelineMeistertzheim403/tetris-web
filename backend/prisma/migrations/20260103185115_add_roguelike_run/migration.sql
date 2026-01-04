-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('IN_PROGRESS', 'FINISHED', 'ABANDONED');

-- CreateTable
CREATE TABLE "RoguelikeRun" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "lines" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "perks" JSONB NOT NULL,
    "bombs" INTEGER NOT NULL,
    "timeFreezeCharges" INTEGER NOT NULL,
    "chaosMode" BOOLEAN NOT NULL,
    "gravityMultiplier" DOUBLE PRECISION NOT NULL,
    "scoreMultiplier" DOUBLE PRECISION NOT NULL,
    "status" "RunStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "RoguelikeRun_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RoguelikeRun" ADD CONSTRAINT "RoguelikeRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
