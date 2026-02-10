-- CreateEnum
CREATE TYPE "BrickfallRole" AS ENUM ('ARCHITECT', 'DEMOLISHER');

-- CreateTable
CREATE TABLE "BrickfallVersusMatch" (
    "id" SERIAL NOT NULL,
    "matchId" TEXT,
    "player1Id" INTEGER,
    "player1Pseudo" TEXT NOT NULL,
    "player1Role" "BrickfallRole" NOT NULL,
    "player1Score" INTEGER NOT NULL,
    "player1Lines" INTEGER NOT NULL,
    "player2Id" INTEGER,
    "player2Pseudo" TEXT NOT NULL,
    "player2Role" "BrickfallRole" NOT NULL,
    "player2Score" INTEGER NOT NULL,
    "player2Lines" INTEGER NOT NULL,
    "winnerId" INTEGER,
    "winnerPseudo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrickfallVersusMatch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BrickfallVersusMatch" ADD CONSTRAINT "BrickfallVersusMatch_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrickfallVersusMatch" ADD CONSTRAINT "BrickfallVersusMatch_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrickfallVersusMatch" ADD CONSTRAINT "BrickfallVersusMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
