-- AlterEnum
ALTER TYPE "GameMode" ADD VALUE 'ROGUELIKE_VERSUS';

-- CreateTable
CREATE TABLE "RoguelikeVersusMatch" (
    "id" SERIAL NOT NULL,
    "matchId" TEXT,
    "player1Id" INTEGER,
    "player1Pseudo" TEXT NOT NULL,
    "player1Score" INTEGER NOT NULL,
    "player1Lines" INTEGER NOT NULL,
    "player2Id" INTEGER,
    "player2Pseudo" TEXT NOT NULL,
    "player2Score" INTEGER NOT NULL,
    "player2Lines" INTEGER NOT NULL,
    "winnerId" INTEGER,
    "winnerPseudo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoguelikeVersusMatch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RoguelikeVersusMatch" ADD CONSTRAINT "RoguelikeVersusMatch_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoguelikeVersusMatch" ADD CONSTRAINT "RoguelikeVersusMatch_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoguelikeVersusMatch" ADD CONSTRAINT "RoguelikeVersusMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
