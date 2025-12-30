-- CreateTable
CREATE TABLE "VersusMatch" (
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

    CONSTRAINT "VersusMatch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VersusMatch" ADD CONSTRAINT "VersusMatch_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersusMatch" ADD CONSTRAINT "VersusMatch_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersusMatch" ADD CONSTRAINT "VersusMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
