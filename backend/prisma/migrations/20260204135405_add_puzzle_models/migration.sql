-- DropForeignKey
ALTER TABLE "UserAchievementStats" DROP CONSTRAINT "UserAchievementStats_userId_fkey";

-- AlterTable
ALTER TABLE "RoguelikeRun" ALTER COLUMN "mutations" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Puzzle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Puzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuzzleAttempt" (
    "id" SERIAL NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "movesUsed" INTEGER NOT NULL,
    "linesCleared" INTEGER NOT NULL,
    "piecesPlaced" INTEGER NOT NULL,
    "holdUsed" BOOLEAN NOT NULL,
    "efficiencyScore" INTEGER NOT NULL,
    "optimal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuzzleAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuzzleSolution" (
    "id" SERIAL NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "movesUsed" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "optimal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuzzleSolution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PuzzleAttempt_userId_puzzleId_idx" ON "PuzzleAttempt"("userId", "puzzleId");

-- CreateIndex
CREATE INDEX "PuzzleSolution_userId_puzzleId_idx" ON "PuzzleSolution"("userId", "puzzleId");

-- AddForeignKey
ALTER TABLE "UserAchievementStats" ADD CONSTRAINT "UserAchievementStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuzzleAttempt" ADD CONSTRAINT "PuzzleAttempt_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuzzleAttempt" ADD CONSTRAINT "PuzzleAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuzzleSolution" ADD CONSTRAINT "PuzzleSolution_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuzzleSolution" ADD CONSTRAINT "PuzzleSolution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
